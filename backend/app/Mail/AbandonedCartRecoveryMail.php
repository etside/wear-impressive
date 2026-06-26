<?php

namespace App\Mail;

use App\Models\AbandonedCart;
use App\Models\Store;

class AbandonedCartRecoveryMail extends BaseStoreMail
{
    public function __construct(
        public AbandonedCart $cart,
        public ?string $discountCode = null,
        public ?Store $store = null,
    ) {
        $this->store = $store ?? $cart->store;
    }

    protected function templateKey(): string
    {
        return 'abandoned_cart';
    }

    protected function defaultView(): string
    {
        return 'emails.abandoned-cart';
    }

    protected function defaultSubject(): string
    {
        return 'You left something in your cart, {{customer_name}}';
    }

    protected function placeholders(): array
    {
        $name = $this->cart->customer?->name
            ?? ($this->cart->guest_email ? explode('@', $this->cart->guest_email)[0] : 'there');

        $cartUrl = url('/cart/recover/'.$this->cart->recovery_token);

        return [
            'customer_name' => $name,
            'cart_url' => $cartUrl,
            'recovery_url' => $cartUrl,
            'discount_code' => $this->discountCode ?? '',
            'total' => number_format((float) $this->cart->total, 2),
            'store_name' => $this->store?->name ?? '',
            'store_url' => $this->store?->domain ? 'https://'.$this->store->domain : url('/'),
        ];
    }

    protected function storeForTemplate(): ?Store
    {
        return $this->store;
    }

    protected function recipientEmail(): ?string
    {
        return $this->cart->customer?->email ?? $this->cart->guest_email;
    }
}
