<?php

namespace App\Http\Requests\Customer\Wishlist;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWishlistRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $storeId = $this->storeId();

        return [
            'product_id' => [
                'required',
                Rule::exists('products', 'id')->where(
                    fn ($q) => $q->where('store_id', $storeId)
                ),
            ],
            'variant_id' => [
                'nullable',
                Rule::exists('product_variants', 'id'),
            ],
        ];
    }

    protected function storeId(): ?int
    {
        $store = $this->attributes->get('store') ?? ($this->store ?? null);

        return $store?->id;
    }
}
