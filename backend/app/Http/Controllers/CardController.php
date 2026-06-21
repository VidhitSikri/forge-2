<?php

namespace App\Http\Controllers;

use App\Http\Requests\MoveCardRequest;
use App\Http\Requests\ReorderCardsRequest;
use App\Http\Requests\StoreCardRequest;
use App\Http\Requests\UpdateCardRequest;
use App\Http\Resources\CardResource;
use App\Http\Resources\ColumnResource;
use App\Models\Card;
use App\Models\Column;
use App\Services\CardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use InvalidArgumentException;

class CardController extends Controller
{
    public function __construct(private readonly CardService $cardService)
    {
    }

    /**
     * GET /api/columns/{column}/cards
     */
    public function index(Column $column): JsonResponse
    {
        $cards = $column->cards()->orderBy('position')->get();

        return CardResource::collection($cards)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * POST /api/columns/{column}/cards
     */
    public function store(StoreCardRequest $request, Column $column): JsonResponse
    {
        $data = $request->validated();

        if (! isset($data['position'])) {
            $data['position'] = ((int) $column->cards()->max('position')) + 1;
        }

        // Make room.
        $column->cards()->where('position', '>=', $data['position'])->increment('position');

        $card = $column->cards()->create($data);

        return (new CardResource($card))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * GET /api/cards/{card}
     */
    public function show(Card $card): JsonResponse
    {
        return (new CardResource($card))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * PUT/PATCH /api/cards/{card}
     */
    public function update(UpdateCardRequest $request, Card $card): JsonResponse
    {
        $card->update($request->validated());

        return (new CardResource($card->fresh()))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * DELETE /api/cards/{card}
     */
    public function destroy(Card $card): Response
    {
        $card->delete();

        return response()->noContent(); // 204
    }

    /**
     * POST /api/cards/{card}/move
     * Body: { target_column_id: int, position?: int }
     */
    public function move(MoveCardRequest $request, Card $card): JsonResponse
    {
        $data = $request->validate([
            'target_column_id' => ['required', 'integer', 'exists:columns,id'],
            'position' => ['nullable', 'integer', 'min:1'],
        ]);

        $target = Column::findOrFail($data['target_column_id']);

        try {
            $moved = $this->cardService->move($card, $target, $data['position'] ?? null);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return (new CardResource($moved))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * POST /api/columns/{column}/cards/reorder
     * Body: { card_ids: [int, int, ...] }
     */
    public function reorder(ReorderCardsRequest $request, Column $column): JsonResponse
    {
        $data = $request->validated();

        try {
            $this->cardService->reorder($column, $data['card_ids']);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $column->load('cards');

        return (new ColumnResource($column))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }
}
