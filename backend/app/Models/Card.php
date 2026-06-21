<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Card model.
 *
 * Extension points reserved for future tasks:
 *  - tags(): MorphToMany — for the Tags feature (polymorphic taggables table).
 *  - members(): BelongsToMany — for Member Assignments (card_user pivot).
 *  - attachments(): MorphMany — for file attachments (polymorphic).
 */
class Card extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'column_id',
        'title',
        'description',
        'due_date',
        'position',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'due_date' => 'datetime',
            'position' => 'integer',
        ];
    }

    /**
     * Get the column that owns this card.
     */
    public function column(): BelongsTo
    {
        return $this->belongsTo(Column::class);
    }
}
