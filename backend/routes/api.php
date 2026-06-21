<?php

use App\Http\Controllers\BoardController;
use App\Http\Controllers\CardController;
use App\Http\Controllers\ColumnController;
use Illuminate\Support\Facades\Route;

// Health check for the API surface.
Route::get('/ping', fn () => response()->json(['pong' => true]));

// Boards
Route::get('/boards', [BoardController::class, 'index']);
Route::post('/boards', [BoardController::class, 'store']);
Route::get('/boards/{board}', [BoardController::class, 'show']);
Route::match(['put', 'patch'], '/boards/{board}', [BoardController::class, 'update']);
Route::delete('/boards/{board}', [BoardController::class, 'destroy']);

// Columns nested under a board
Route::get('/boards/{board}/columns', [ColumnController::class, 'index']);
Route::post('/boards/{board}/columns', [ColumnController::class, 'store']);

// Columns by id
Route::get('/columns/{column}', [ColumnController::class, 'show']);
Route::match(['put', 'patch'], '/columns/{column}', [ColumnController::class, 'update']);
Route::delete('/columns/{column}', [ColumnController::class, 'destroy']);

// Cards nested under a column
Route::get('/columns/{column}/cards', [CardController::class, 'index']);
Route::post('/columns/{column}/cards', [CardController::class, 'store']);

// Reorder cards within a column
Route::post('/columns/{column}/cards/reorder', [CardController::class, 'reorder']);

// Cards by id
Route::get('/cards/{card}', [CardController::class, 'show']);
Route::match(['put', 'patch'], '/cards/{card}', [CardController::class, 'update']);
Route::delete('/cards/{card}', [CardController::class, 'destroy']);

// Card movement (transfer to another column, optionally at a position)
Route::post('/cards/{card}/move', [CardController::class, 'move']);
