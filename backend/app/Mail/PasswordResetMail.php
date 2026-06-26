<?php

namespace App\Mail;

use App\Models\Store;

class PasswordResetMail extends BaseStoreMail
{
    /**
     * @param  object  $user  Customer or Vendor
     */
    public function __construct(
        public object $user,
        public string $token,
        public ?Store $store = null,
    ) {
        $this->store = $store ?? ($user->store ?? null);
    }

    protected function templateKey(): string
    {
        return 'password_reset';
    }

    protected function defaultView(): string
    {
        return 'emails.password-reset';
    }

    protected function defaultSubject(): string
    {
        return 'Reset your {{store_name}} password';
    }

    protected function placeholders(): array
    {
        $resetUrl = url('/reset-password?token='.$this->token.'&email='.urlencode((string) ($this->user->email ?? '')));

        return [
            'customer_name' => $this->user->name ?? 'there',
            'user_name' => $this->user->name ?? 'there',
            'reset_url' => $resetUrl,
            'token' => $this->token,
            'store_name' => $this->store?->name ?? config('app.name'),
            'store_url' => $this->store?->domain ? 'https://'.$this->store->domain : url('/'),
        ];
    }

    protected function storeForTemplate(): ?Store
    {
        return $this->store;
    }

    protected function recipientEmail(): ?string
    {
        return $this->user->email ?? null;
    }
}
