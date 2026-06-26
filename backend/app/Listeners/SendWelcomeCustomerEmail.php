<?php

namespace App\Listeners;

use App\Events\CustomerRegistered;
use App\Mail\WelcomeCustomerMail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Mail;

class SendWelcomeCustomerEmail implements ShouldQueue
{
    public function handle(CustomerRegistered $event): void
    {
        $customer = $event->customer->loadMissing('store');

        if (! $customer->email) {
            return;
        }

        Mail::to($customer->email)->queue(new WelcomeCustomerMail($customer));

        try {
            (new WelcomeCustomerMail($customer))->logEmail('sent');
        } catch (\Throwable $e) {
            // ignore
        }
    }
}
