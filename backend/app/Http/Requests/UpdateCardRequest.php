<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCardRequest extends FormRequest
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
            'title'           => ['sometimes', 'required', 'string', 'max:255'],
            'description'     => ['sometimes', 'nullable', 'string', 'max:65535'],
            'due_date'        => ['sometimes', 'nullable', 'date'],
            'position'        => ['sometimes', 'integer', 'min:0'],
            'tags'            => ['sometimes', 'nullable', 'array'],
            'tags.*'          => ['string', 'max:50'],
            'members'         => ['sometimes', 'nullable', 'array'],
            'members.*.name'  => ['required_with:members', 'string', 'max:100'],
        ];
    }
}
