<?php

namespace App\Http\Requests\Vendor\Categories;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $storeId = $this->storeId();

        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'parent_id' => [
                'nullable',
                Rule::exists('product_categories', 'id')->where(
                    fn ($q) => $q->where('store_id', $storeId)->whereNull('parent_id')
                ),
            ],
            'description' => ['nullable', 'string'],
            'icon_type' => ['nullable', 'in:lucide,upload'],
            'icon_name' => ['nullable', 'string', 'max:100'],
            'icon_url' => ['nullable', 'string', 'max:500'],
            'image' => ['nullable', 'string', 'max:500'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    protected function storeId(): ?int
    {
        $store = $this->attributes->get('store') ?? ($this->store ?? null);

        return $store?->id;
    }
}
