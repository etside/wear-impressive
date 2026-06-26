<?php

namespace App\Http\Requests\Vendor\Brands;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBrandRequest extends FormRequest
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
            'category_id' => [
                'nullable',
                Rule::exists('product_categories', 'id')->where(
                    fn ($q) => $q->where(function ($inner) use ($storeId) {
                        $inner->where('store_id', $storeId)->orWhereNull('store_id');
                    })
                ),
            ],
            'sub_category_id' => [
                'nullable',
                Rule::exists('product_categories', 'id')->where(
                    fn ($q) => $q->where(function ($inner) use ($storeId) {
                        $inner->where('store_id', $storeId)->orWhereNull('store_id');
                    })
                ),
            ],
            'description' => ['nullable', 'string'],
            'logo_type' => ['nullable', 'in:lucide,upload'],
            'logo_name' => ['nullable', 'string', 'max:100'],
            'logo_url' => ['nullable', 'string', 'max:500'],
            'website' => ['nullable', 'string', 'max:255'],
            'featured' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    protected function storeId(): ?int
    {
        $store = $this->attributes->get('store') ?? ($this->store ?? null);

        return $store?->id;
    }
}
