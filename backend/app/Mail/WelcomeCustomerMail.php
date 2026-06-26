<?php

namespace App\Mail;

use App\Models\Customer;
use App\Models\Store;

class WelcomeCustomerMail extends BaseStoreMail
{
    public function __construct(public Customer $customer, public ?Store $store = null)
    {
        $this->store = $store ?? $customer->store;
    }

    protected function templateKey(): string
    {
        return 'welcome';
    }

    protected function defaultView(): string
    {
        return 'emails.welcome-customer';
    }

    protected function defaultSubject(): string
    {
        return 'Welcome to {{store_name}}!';
    }

    protected function placeholders(): array
    {
        return [
            'customer_name' => $this->customer->name ?? 'there',
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
        return $this->customer->email;
    }
}
