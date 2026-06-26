<?php

namespace App\Http\Requests\Customer\Reviews;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreReviewRequest extends FormRequest
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
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'title' => ['nullable', 'string', 'max:255'],
            'content' => ['required', 'string', 'max:5000'],
            'images' => ['nullable', 'array', 'max:6'],
            'images.*' => ['string', 'max:500'],
            'order_id' => [
                'nullable',
                Rule::exists('orders', 'id')->where(
                    fn ($q) => $q->where('store_id', $storeId)
                ),
            ],
        ];
    }

    protected function storeId(): ?int
    {
        $store = $this->attributes->get('store') ?? ($this->store ?? null);

        return $store?->id;
    }
}
