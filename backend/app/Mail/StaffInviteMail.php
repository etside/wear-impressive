<?php

namespace App\Mail;

use App\Models\Staff;
use App\Models\Store;

class StaffInviteMail extends BaseStoreMail
{
    public function __construct(public Staff $staff, public ?Store $store = null)
    {
        $this->store = $store ?? $staff->store;
    }

    protected function templateKey(): string
    {
        return 'staff_invite';
    }

    protected function defaultView(): string
    {
        return 'emails.staff-invite';
    }

    protected function defaultSubject(): string
    {
        return 'You\'re invited to join {{store_name}}';
    }

    protected function placeholders(): array
    {
        $inviteUrl = url('/staff/accept-invite?token='.$this->staff->invitation_token);

        return [
            'staff_name' => $this->staff->name ?? 'there',
            'customer_name' => $this->staff->name ?? 'there',
            'invite_url' => $inviteUrl,
            'accept_url' => $inviteUrl,
            'role' => ucfirst((string) $this->staff->role),
            'invited_by' => $this->staff->invitedBy?->name ?? 'Your team',
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
        return $this->staff->email;
    }
}
