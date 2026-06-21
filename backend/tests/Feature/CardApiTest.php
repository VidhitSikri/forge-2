<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Column;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CardApiTest extends TestCase
{
    use RefreshDatabase;

    private function boardWithColumns(int $columns = 2): array
    {
        $board = Board::factory()->create();
        $cols = [];
        for ($i = 1; $i <= $columns; $i++) {
            $cols[] = $board->columns()->create(['name' => "Col {$i}", 'order' => $i]);
        }

        return [$board, ...$cols];
    }

    public function test_can_list_cards_in_column_ordered_by_position(): void
    {
        [, $colA] = $this->boardWithColumns();
        $colA->cards()->createMany([
            ['title' => 'B', 'position' => 2],
            ['title' => 'A', 'position' => 1],
            ['title' => 'C', 'position' => 3],
        ]);

        $this->getJson("/api/columns/{$colA->id}/cards")
            ->assertOk()
            ->assertJsonPath('data.0.title', 'A')
            ->assertJsonPath('data.1.title', 'B')
            ->assertJsonPath('data.2.title', 'C');
    }

    public function test_can_create_card_with_all_fields(): void
    {
        [, $col] = $this->boardWithColumns();

        $this->postJson("/api/columns/{$col->id}/cards", [
            'title' => 'Implement login',
            'description' => 'OAuth + email',
            'due_date' => '2026-12-31T23:59:00+00:00',
            'position' => 1,
        ])
            ->assertCreated()
            ->assertJsonPath('data.title', 'Implement login')
            ->assertJsonPath('data.description', 'OAuth + email')
            ->assertJsonPath('data.position', 1);
    }

    public function test_create_card_auto_assigns_position(): void
    {
        [, $col] = $this->boardWithColumns();
        $col->cards()->create(['title' => 'A', 'position' => 1]);
        $col->cards()->create(['title' => 'B', 'position' => 2]);

        $this->postJson("/api/columns/{$col->id}/cards", ['title' => 'C'])
            ->assertCreated()
            ->assertJsonPath('data.position', 3);
    }

    public function test_create_card_validates_title(): void
    {
        [, $col] = $this->boardWithColumns();

        $this->postJson("/api/columns/{$col->id}/cards", ['description' => 'no title'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['title']);
    }

    public function test_can_view_card(): void
    {
        [, $col] = $this->boardWithColumns();
        $card = $col->cards()->create(['title' => 'A', 'position' => 1]);

        $this->getJson("/api/cards/{$card->id}")
            ->assertOk()
            ->assertJsonPath('data.title', 'A');
    }

    public function test_can_update_card(): void
    {
        [, $col] = $this->boardWithColumns();
        $card = $col->cards()->create(['title' => 'Old', 'position' => 1]);

        $this->patchJson("/api/cards/{$card->id}", ['title' => 'New', 'description' => 'now with desc'])
            ->assertOk()
            ->assertJsonPath('data.title', 'New')
            ->assertJsonPath('data.description', 'now with desc');
    }

    public function test_can_delete_card(): void
    {
        [, $col] = $this->boardWithColumns();
        $card = $col->cards()->create(['title' => 'A', 'position' => 1]);

        $this->deleteJson("/api/cards/{$card->id}")->assertNoContent();

        $this->assertDatabaseMissing('cards', ['id' => $card->id]);
    }

    public function test_move_card_to_another_column_updates_position(): void
    {
        [, $colA, $colB] = $this->boardWithColumns(2);
        $a1 = $colA->cards()->create(['title' => 'A1', 'position' => 1]);
        $colA->cards()->create(['title' => 'A2', 'position' => 2]);
        $colA->cards()->create(['title' => 'A3', 'position' => 3]);
        $colB->cards()->create(['title' => 'B1', 'position' => 1]);

        // Move A2 (id=2) to column B at position 1.
        $this->postJson("/api/cards/{$a1->id}/move", [
            'target_column_id' => $colB->id,
            'position' => 1,
        ])->assertOk()->assertJsonPath('data.column_id', $colB->id);

        $this->assertDatabaseHas('cards', ['id' => $a1->id, 'column_id' => $colB->id, 'position' => 1]);

        // Source column A should be densified: A2 -> pos 1, A3 -> pos 2.
        $colA->refresh();
        $this->assertSame([1, 2], $colA->cards()->orderBy('position')->pluck('position')->all());

        // Target column B: B1 shifted to pos 2, A1 inserted at pos 1.
        $colB->refresh();
        $this->assertSame([1, 2], $colB->cards()->orderBy('position')->pluck('position')->all());
        $this->assertSame($a1->id, $colB->cards()->where('position', 1)->value('id'));
    }

    public function test_move_card_appends_when_position_omitted(): void
    {
        [, $colA, $colB] = $this->boardWithColumns(2);
        $card = $colA->cards()->create(['title' => 'X', 'position' => 1]);
        $colB->cards()->create(['title' => 'B1', 'position' => 1]);
        $colB->cards()->create(['title' => 'B2', 'position' => 2]);

        $this->postJson("/api/cards/{$card->id}/move", ['target_column_id' => $colB->id])
            ->assertOk()
            ->assertJsonPath('data.position', 3);

        $this->assertDatabaseHas('cards', ['id' => $card->id, 'column_id' => $colB->id, 'position' => 3]);
    }

    public function test_move_card_validates_target_column_id(): void
    {
        [, $col] = $this->boardWithColumns();
        $card = $col->cards()->create(['title' => 'X', 'position' => 1]);

        $this->postJson("/api/cards/{$card->id}/move", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['target_column_id']);

        $this->postJson("/api/cards/{$card->id}/move", ['target_column_id' => 99999])
            ->assertStatus(422);
    }

    public function test_reorder_cards_within_column(): void
    {
        [, $col] = $this->boardWithColumns();
        $c1 = $col->cards()->create(['title' => 'A', 'position' => 1]);
        $c2 = $col->cards()->create(['title' => 'B', 'position' => 2]);
        $c3 = $col->cards()->create(['title' => 'C', 'position' => 3]);

        $this->postJson("/api/columns/{$col->id}/cards/reorder", [
            'card_ids' => [$c3->id, $c1->id, $c2->id],
        ])->assertOk();

        $positions = $col->cards()->orderBy('position')->pluck('position', 'id');
        $this->assertSame(1, $positions[$c3->id]);
        $this->assertSame(2, $positions[$c1->id]);
        $this->assertSame(3, $positions[$c2->id]);
    }

    public function test_reorder_rejects_mismatched_ids(): void
    {
        [, $col] = $this->boardWithColumns();
        $col->cards()->create(['title' => 'A', 'position' => 1]);
        $col->cards()->create(['title' => 'B', 'position' => 2]);

        // Missing one of the column's card ids.
        $this->postJson("/api/columns/{$col->id}/cards/reorder", ['card_ids' => [1]])
            ->assertStatus(400);
    }

    public function test_reorder_validates_card_ids_array(): void
    {
        [, $col] = $this->boardWithColumns();

        $this->postJson("/api/columns/{$col->id}/cards/reorder", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['card_ids']);
    }
}
