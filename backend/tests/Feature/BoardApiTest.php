<?php

namespace Tests\Feature;

use App\Models\Board;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BoardApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_boards(): void
    {
        Board::factory()->count(3)->create();

        $this->getJson('/api/boards')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name', 'description', 'created_at', 'updated_at']]])
            ->assertJsonCount(3, 'data');
    }

    public function test_can_create_board(): void
    {
        $payload = ['name' => 'Sprint', 'description' => 'Q3 planning'];

        $this->postJson('/api/boards', $payload)
            ->assertCreated()
            ->assertJsonPath('data.name', 'Sprint')
            ->assertJsonPath('data.description', 'Q3 planning');

        $this->assertDatabaseHas('boards', $payload);
    }

    public function test_create_board_validates_name(): void
    {
        $this->postJson('/api/boards', ['description' => 'no name'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_can_view_board_with_columns_and_cards(): void
    {
        $board = Board::factory()->create(['name' => 'Loaded']);
        $column = $board->columns()->create(['name' => 'Backlog', 'order' => 1]);
        $column->cards()->create(['title' => 'First', 'position' => 1]);

        $this->getJson("/api/boards/{$board->id}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Loaded')
            ->assertJsonPath('data.columns.0.name', 'Backlog')
            ->assertJsonPath('data.columns.0.cards.0.title', 'First');
    }

    public function test_view_unknown_board_returns_404(): void
    {
        $this->getJson('/api/boards/99999')->assertNotFound();
    }

    public function test_can_update_board(): void
    {
        $board = Board::factory()->create(['name' => 'Old']);

        $this->patchJson("/api/boards/{$board->id}", ['name' => 'New'])
            ->assertOk()
            ->assertJsonPath('data.name', 'New');

        $this->assertDatabaseHas('boards', ['id' => $board->id, 'name' => 'New']);
    }

    public function test_can_delete_board(): void
    {
        $board = Board::factory()->create();

        $this->deleteJson("/api/boards/{$board->id}")->assertNoContent();

        $this->assertDatabaseMissing('boards', ['id' => $board->id]);
    }
}
