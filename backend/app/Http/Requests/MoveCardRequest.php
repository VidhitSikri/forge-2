<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MoveCardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // target_column_id lives in the URL; the controller binds it.
            'position' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
