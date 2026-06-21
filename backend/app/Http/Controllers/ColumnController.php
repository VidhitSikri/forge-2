<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreColumnRequest;
use App\Http\Requests\UpdateColumnRequest;
use App\Http\Resources\ColumnResource;
use App\Models\Board;
use App\Models\Column;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class ColumnController extends Controller
{
    /**
     * GET /api/boards/{board}/columns
     */
    public function index(Board $board): JsonResponse
    {
        $columns = $board->columns()->orderBy('order')->get();

        return ColumnResource::collection($columns)
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * POST /api/boards/{board}/columns
     */
    public function store(StoreColumnRequest $request, Board $board): JsonResponse
    {
        $data = $request->validated();

        // Auto-assign order = max(order)+1 if not provided.
        if (! isset($data['order'])) {
            $data['order'] = ((int) $board->columns()->max('order')) + 1;
        }

        $column = $board->columns()->create($data);

        return (new ColumnResource($column))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * GET /api/columns/{column}
     */
    public function show(Column $column): JsonResponse
    {
        $column->load('cards');

        return (new ColumnResource($column))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * PUT/PATCH /api/columns/{column}
     */
    public function update(UpdateColumnRequest $request, Column $column): JsonResponse
    {
        $column->update($request->validated());

        return (new ColumnResource($column->fresh()))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * DELETE /api/columns/{column}
     */
    public function destroy(Column $column): Response
    {
        $column->delete();

        return response()->noContent(); // 204
    }
}
