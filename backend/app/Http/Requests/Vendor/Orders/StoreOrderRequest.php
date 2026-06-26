<?php

namespace App\Http\Requests\Vendor\Orders;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $storeId = $this->storeId();

        return [
            // Customer: either an existing customer_id OR guest info
            'customer_id' => [
                'nullable',
                Rule::exists('customers', 'id')->where(fn ($q) => $q->where('store_id', $storeId)),
            ],
            'customer_address_id' => [
                'nullable',
                'integer',
            ],
            'guest_name' => ['nullable', 'string', 'max:255', 'required_without:customer_id'],
            'guest_email' => ['nullable', 'email', 'max:255'],
            'guest_phone' => ['nullable', 'string', 'max:50', 'required_without:customer_id'],

            'branch_id' => [
                'nullable',
                Rule::exists('branches', 'id')->where(fn ($q) => $q->where('store_id', $storeId)),
            ],

            // Items
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => [
                'required',
                Rule::exists('products', 'id')->where(fn ($q) => $q->where('store_id', $storeId)),
            ],
            'items.*.variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.price' => ['nullable', 'numeric', 'min:0'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0'],

            // Addresses
            'shipping_address' => ['nullable', 'array'],
            'shipping_address.name' => ['nullable', 'string', 'max:255'],
            'shipping_address.phone' => ['nullable', 'string', 'max:50'],
            'shipping_address.address_line_1' => ['nullable', 'string'],
            'shipping_address.address_line_2' => ['nullable', 'string'],
            'shipping_address.city' => ['nullable', 'string'],
            'shipping_address.district' => ['nullable', 'string'],
            'shipping_address.thana' => ['nullable', 'string'],
            'shipping_address.postal_code' => ['nullable', 'string'],
            'billing_address' => ['nullable', 'array'],

            // Totals / pricing
            'shipping_amount' => ['nullable', 'numeric', 'min:0'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'tax_amount' => ['nullable', 'numeric', 'min:0'],
            'coupon_code' => ['nullable', 'string', 'max:100'],
            'currency' => ['nullable', 'string', 'max:8'],

            // Status / payment
            'status' => ['nullable', Rule::in([
                'pending', 'confirmed', 'processing', 'packed', 'shipped',
                'out_for_delivery', 'delivered', 'cancelled', 'refunded', 'returned',
            ])],
            'payment_status' => ['nullable', Rule::in(['pending', 'paid', 'partial', 'failed', 'refunded'])],
            'payment_method' => ['nullable', Rule::in(['bkash', 'nagad', 'sslcommerz', 'cod', 'stripe', 'cash', 'card', 'other'])],
            'payment_reference' => ['nullable', 'string', 'max:255'],

            'notes' => ['nullable', 'string'],
            'internal_notes' => ['nullable', 'string'],
            'metadata' => ['nullable', 'array'],
        ];
    }

    protected function storeId(): ?int
    {
        $store = $this->attributes->get('store') ?? ($this->store ?? null);

        return $store?->id;
    }
}
