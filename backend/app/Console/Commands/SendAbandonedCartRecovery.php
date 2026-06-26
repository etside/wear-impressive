<?php

namespace App\Console\Commands;

use App\Mail\AbandonedCartRecoveryMail;
use App\Models\AbandonedCart;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendAbandonedCartRecovery extends Command
{
    protected $signature = 'wi:send-abandoned-recovery';

    protected $description = 'Send recovery emails for abandoned carts that are 1h–7d old and unrecovered.';

    public function handle(): int
    {
        $now = now();

        $carts = AbandonedCart::query()
            ->whereNull('recovered_at')
            // Only carts between 1h and 7d old
            ->where('last_activity_at', '<', $now->copy()->subHour())
            ->where('last_activity_at', '>', $now->copy()->subDays(7))
            // Either never reminded, or last reminder > 24h ago
            ->where(function ($q) use ($now) {
                $q->whereNull('recovery_email_sent_at')
                    ->orWhere('recovery_email_sent_at', '<', $now->copy()->subDay());
            })
            ->with(['store', 'customer'])
            ->get();

        $sent = 0;
        foreach ($carts as $cart) {
            $email = $cart->customer?->email ?? $cart->guest_email;
            if (! $email) {
                continue;
            }

            try {
                Mail::to($email)->queue(new AbandonedCartRecoveryMail($cart));
                $cart->recovery_email_sent_at = now();
                $cart->save();
                $sent++;
            } catch (\Throwable $e) {
                $this->warn("Failed for cart {$cart->id}: {$e->getMessage()}");
            }
        }

        $this->info("Queued {$sent} recovery email(s).");

        return self::SUCCESS;
    }
}
