<?php

namespace App\Http\Requests\Storefront;

use Illuminate\Foundation\Http\FormRequest;

class PlaceOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function prepareForValidation(): void
    {
        // Storefront sends guest fields as `guest_*`; legacy callers send plain
        // `name`/`email`/`phone`. Normalize both shapes to the plain keys.
        $this->merge([
            'name' => $this->input('name') ?? $this->input('guest_name'),
            'email' => $this->input('email') ?? $this->input('guest_email'),
            'phone' => $this->input('phone') ?? $this->input('guest_phone'),
        ]);
    }

    public function rules(): array
    {
        $isGuest = ! auth('customer')->check();
        $hasSavedAddress = $this->filled('shipping_address_id');

        return [
            // Guest fields. Name + phone are always required for guests (we need
            // to contact the customer); email is optional because vendors can
            // hide it from their checkout config.
            'name' => [$isGuest && ! $hasSavedAddress ? 'required' : 'nullable', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => [$isGuest && ! $hasSavedAddress ? 'required' : 'nullable', 'string', 'max:32'],
            'guest_name' => ['nullable', 'string', 'max:255'],
            'guest_email' => ['nullable', 'string', 'email', 'max:255'],
            'guest_phone' => ['nullable', 'string', 'max:32'],
            'shipping_rate_id' => ['nullable', 'integer'],
            'payment_reference' => ['nullable', 'string', 'max:255'],
            'billing_address' => ['nullable', 'array'],
            'customer_id' => ['nullable', 'integer'],

            // Authed customers can reference a saved address.
            'shipping_address_id' => ['nullable', 'integer'],

            // Shipping address payload (required if no shipping_address_id).
            'shipping_address' => ['nullable', 'array'],
            'shipping_address.full_name' => ['nullable', 'string', 'max:255'],
            'shipping_address.phone' => ['nullable', 'string', 'max:32'],
            'shipping_address.address_line_1' => ['nullable', 'string', 'max:500'],
            'shipping_address.address_line_2' => ['nullable', 'string', 'max:500'],
            'shipping_address.division' => ['nullable', 'string', 'max:100'],
            'shipping_address.district' => ['nullable', 'string', 'max:100'],
            'shipping_address.thana' => ['nullable', 'string', 'max:100'],
            'shipping_address.area' => ['nullable', 'string', 'max:100'],
            'shipping_address.postal_code' => ['nullable', 'string', 'max:20'],

            // Items: optional — when omitted, the server reads the user's cart.
            'items' => ['nullable', 'array'],
            'items.*.product_id' => ['required_with:items', 'integer'],
            'items.*.variant_id' => ['nullable', 'integer'],
            'items.*.quantity' => ['required_with:items', 'integer', 'min:1'],

            'payment_method' => [
                'required',
                'string',
                'in:bkash,nagad,sslcommerz,cod,stripe,cash,card,manual,other',
            ],
            'payment_proof_url' => ['nullable', 'string', 'max:1024'],
            // Accepts the legacy short codes (bkash/nagad/rocket) AND the new
            // channel id format (ch_abc123) — the manual gateway is now a list
            // of vendor-defined channels rather than three fixed wallets.
            'payment_wallet' => ['nullable', 'string', 'max:64'],
            'coupon_code' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'cart_token' => ['nullable', 'string'],
        ];
    }
}
