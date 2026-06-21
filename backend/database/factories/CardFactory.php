<?php

namespace Database\Factories;

use App\Models\Card;
use App\Models\Column;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Card>
 */
class CardFactory extends Factory
{
    protected $model = Card::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'column_id' => Column::factory(),
            'title' => fake()->sentence(3),
            'description' => fake()->optional(0.5)->paragraph(),
            'due_date' => fake()->optional(0.3)->dateTimeBetween('now', '+1 month'),
            'position' => 0,
        ];
    }
}
