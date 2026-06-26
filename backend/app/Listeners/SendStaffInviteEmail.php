<?php

namespace App\Listeners;

use App\Events\StaffInvited;
use App\Mail\StaffInviteMail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Mail;

class SendStaffInviteEmail implements ShouldQueue
{
    public function handle(StaffInvited $event): void
    {
        $staff = $event->staff->loadMissing(['store', 'invitedBy']);

        if (! $staff->email) {
            return;
        }

        Mail::to($staff->email)->queue(new StaffInviteMail($staff));

        try {
            (new StaffInviteMail($staff))->logEmail('sent');
        } catch (\Throwable $e) {
            // ignore
        }
    }
}
