<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCardRequest extends FormRequest
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
            'title'           => ['required', 'string', 'max:255'],
            'description'     => ['nullable', 'string', 'max:65535'],
            'due_date'        => ['nullable', 'date'],
            'position'        => ['nullable', 'integer', 'min:0'],
            'tags'            => ['nullable', 'array'],
            'tags.*'          => ['string', 'max:50'],
            'members'         => ['nullable', 'array'],
            'members.*.name'  => ['required_with:members', 'string', 'max:100'],
        ];
    }
}
