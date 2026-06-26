<?php

namespace App\Http\Requests\Vendor\Collections;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCollectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'image' => ['nullable', 'string', 'max:500'],
            'type' => ['nullable', 'in:manual,automatic'],
            'conditions' => ['nullable', 'array'],
            'status' => ['nullable', 'in:active,draft'],
        ];
    }
}
