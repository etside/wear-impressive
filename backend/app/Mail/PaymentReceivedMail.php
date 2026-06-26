<?php

namespace App\Mail;

use App\Models\Order;
use App\Models\Store;

class PaymentReceivedMail extends BaseStoreMail
{
    public function __construct(public Order $order, public ?Store $store = null)
    {
        $this->store = $store ?? $order->store;
    }

    protected function templateKey(): string
    {
        return 'payment_received';
    }

    protected function defaultView(): string
    {
        return 'emails.payment-received';
    }

    protected function defaultSubject(): string
    {
        return 'Payment received for order {{order_number}}';
    }

    protected function placeholders(): array
    {
        return [
            'customer_name' => $this->order->customer?->name ?? $this->order->guest_name ?? 'there',
            'order_number' => $this->order->order_number,
            'amount' => number_format((float) $this->order->total, 2),
            'currency' => $this->order->currency,
            'payment_method' => ucfirst((string) $this->order->payment_method),
            'payment_reference' => (string) $this->order->payment_reference,
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
        return $this->order->customer?->email ?? $this->order->guest_email;
    }
}
