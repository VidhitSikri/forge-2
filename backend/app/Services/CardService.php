<?php

namespace App\Services;

use App\Models\Card;
use App\Models\Column;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CardService
{
    /**
     * Move a card to a (possibly different) column, optionally at a specific position.
     *
     * Behavior:
     *  - Source column's positions are densified (renumbered 1..N, no gaps).
     *  - Card is assigned to the target column at $position (1-based) or appended if null.
     *  - Target column's positions are densified.
     *  - All work happens inside a single DB transaction.
     *
     * @throws InvalidArgumentException when the position is out of range.
     */
    public function move(Card $card, Column $target, ?int $position = null): Card
    {
        if ($position !== null && $position < 1) {
            throw new InvalidArgumentException('Position must be >= 1.');
        }

        return DB::transaction(function () use ($card, $target, $position) {
            $source = $card->column()->firstOrFail();

            // 1. Densify the source column (excluding the moving card, which we'll detach).
            $this->densifyColumn($source, $excludeCardId = $card->id);

            // 2. Decide final position in the target column.
            if ($position === null) {
                $position = ($target->cards()->max('position') ?? 0) + 1;
            } else {
                // Clamp to legal range: [1, count+1].
                $count = $target->cards()->count();
                $position = min($position, $count + 1);
            }

            // 3. Make room in the target by shifting cards at >= position up by 1.
            $target->cards()
                ->where('position', '>=', $position)
                ->increment('position');

            // 4. Attach the card to the target column at the chosen position.
            $card->column_id = $target->id;
            $card->position = $position;
            $card->save();

            return $card->fresh();
        });
    }

    /**
     * Reorder cards within a column to match the supplied id sequence.
     *
     * The provided $orderedIds must contain exactly the ids of every card in the column.
     * After the call, positions are densified to 1..N matching the given order.
     *
     * @param  array<int>  $orderedIds
     *
     * @throws InvalidArgumentException when the id set does not match the column's cards.
     */
    public function reorder(Column $column, array $orderedIds): Column
    {
        return DB::transaction(function () use ($column, $orderedIds) {
            $existingIds = $column->cards()->orderBy('position')->pluck('id')->all();

            // Validate the supplied id set matches exactly.
            $sortedProvided = $orderedIds;
            sort($sortedProvided);
            $sortedExisting = $existingIds;
            sort($sortedExisting);

            if ($sortedProvided !== $sortedExisting) {
                throw new InvalidArgumentException(
                    'Provided card ids do not match the cards in this column.'
                );
            }

            // Position -> card id map for the new ordering.
            $positionById = [];
            foreach (array_values($orderedIds) as $i => $id) {
                $positionById[(int) $id] = $i + 1;
            }

            // Update positions. We update one at a time, which is fine at Kanban scale
            // (dozens of cards per column). Using a temporary offset avoids the
            // unique-like semantics that would otherwise let a swap collide mid-update.
            // No unique index exists on (column_id, position) today, so a simpler
            // update is safe; the offset approach is defensive and explicit.
            $offset = 1_000_000;
            foreach ($positionById as $id => $pos) {
                Card::where('id', $id)->update(['position' => $pos + $offset]);
            }
            foreach ($positionById as $id => $pos) {
                Card::where('id', $id)->update(['position' => $pos]);
            }

            return $column->fresh();
        });
    }

    /**
     * Renumber positions in a column to 1..N based on current order, excluding one card id.
     */
    private function densifyColumn(Column $column, ?int $excludeCardId = null): void
    {
        $query = $column->cards()->orderBy('position')->orderBy('id');
        if ($excludeCardId !== null) {
            $query->where('id', '!=', $excludeCardId);
        }

        $i = 1;
        foreach ($query->pluck('id') as $cid) {
            Card::where('id', $cid)->update(['position' => $i]);
            $i++;
        }
    }
}
