<?php

namespace Tests\Feature;

use App\Models\Board;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ColumnApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_columns_for_board(): void
    {
        $board = Board::factory()->create();
        $board->columns()->createMany([
            ['name' => 'Todo', 'order' => 1],
            ['name' => 'Doing', 'order' => 2],
            ['name' => 'Done', 'order' => 3],
        ]);

        $this->getJson("/api/boards/{$board->id}/columns")
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.name', 'Todo')
            ->assertJsonPath('data.2.name', 'Done');
    }

    public function test_can_create_column_with_auto_order(): void
    {
        $board = Board::factory()->create();
        $board->columns()->create(['name' => 'First', 'order' => 1]);

        $this->postJson("/api/boards/{$board->id}/columns", ['name' => 'Second'])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Second')
            ->assertJsonPath('data.order', 2)
            ->assertJsonPath('data.board_id', $board->id);
    }

    public function test_can_create_column_with_explicit_order(): void
    {
        $board = Board::factory()->create();

        $this->postJson("/api/boards/{$board->id}/columns", ['name' => 'Skip', 'order' => 5])
            ->assertCreated()
            ->assertJsonPath('data.order', 5);
    }

    public function test_create_column_validates_name(): void
    {
        $board = Board::factory()->create();

        $this->postJson("/api/boards/{$board->id}/columns", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_can_view_single_column(): void
    {
        $board = Board::factory()->create();
        $column = $board->columns()->create(['name' => 'Backlog', 'order' => 1]);

        $this->getJson("/api/columns/{$column->id}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Backlog');
    }

    public function test_can_update_column(): void
    {
        $board = Board::factory()->create();
        $column = $board->columns()->create(['name' => 'Old', 'order' => 1]);

        $this->patchJson("/api/columns/{$column->id}", ['name' => 'New', 'order' => 2])
            ->assertOk()
            ->assertJsonPath('data.name', 'New')
            ->assertJsonPath('data.order', 2);
    }

    public function test_can_delete_column_and_cascade_cards(): void
    {
        $board = Board::factory()->create();
        $column = $board->columns()->create(['name' => 'Backlog', 'order' => 1]);
        $column->cards()->create(['title' => 'A', 'position' => 1]);
        $column->cards()->create(['title' => 'B', 'position' => 2]);

        $this->deleteJson("/api/columns/{$column->id}")->assertNoContent();

        $this->assertDatabaseMissing('columns', ['id' => $column->id]);
        $this->assertDatabaseMissing('cards', ['column_id' => $column->id]);
    }
}
