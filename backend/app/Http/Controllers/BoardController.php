<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBoardRequest;
use App\Http\Requests\UpdateBoardRequest;
use App\Http\Resources\BoardResource;
use App\Models\Board;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class BoardController extends Controller
{
    /**
     * GET /api/boards
     */
    public function index(): JsonResponse
    {
        $boards = Board::orderBy('id')->get();

        return BoardResource::collection($boards)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * POST /api/boards
     */
    public function store(StoreBoardRequest $request): JsonResponse
    {
        $board = Board::create($request->validated());

        return (new BoardResource($board))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * GET /api/boards/{board}
     */
    public function show(Board $board): JsonResponse
    {
        $board->load(['columns.cards']);

        return (new BoardResource($board))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * PUT/PATCH /api/boards/{board}
     */
    public function update(UpdateBoardRequest $request, Board $board): JsonResponse
    {
        $board->update($request->validated());

        return (new BoardResource($board->fresh()))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * DELETE /api/boards/{board}
     */
    public function destroy(Board $board): Response
    {
        $board->delete();

        return response()->noContent(); // 204
    }
}
