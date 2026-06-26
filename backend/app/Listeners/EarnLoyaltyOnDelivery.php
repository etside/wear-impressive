<?php

namespace App\Listeners;

use App\Events\OrderDelivered;
use App\Models\LoyaltyAccount;
use App\Models\LoyaltyConfig;
use App\Models\LoyaltyTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EarnLoyaltyOnDelivery
{
    public function handle(OrderDelivered $event): void
    {
        $order = $event->order;

        if (! $order->customer_id) {
            return; // guests don't earn loyalty
        }

        $config = LoyaltyConfig::where('store_id', $order->store_id)->first();

        if (! $config || ! $config->is_active || $config->spend_amount_for_points <= 0) {
            return;
        }

        $orderTotal = (float) $order->total - (float) ($order->discount_amount ?? 0);
        if ($orderTotal <= 0) {
            return;
        }

        $points = (int) floor(($orderTotal / $config->spend_amount_for_points) * $config->points_per_spend);
        if ($points <= 0) {
            return;
        }

        try {
            DB::transaction(function () use ($order, $config, $points) {
                $account = LoyaltyAccount::firstOrCreate(
                    ['store_id' => $order->store_id, 'customer_id' => $order->customer_id],
                    ['balance' => 0, 'total_earned' => 0, 'total_redeemed' => 0]
                );

                $account->increment('balance', $points);
                $account->increment('total_earned', $points);

                LoyaltyTransaction::create([
                    'loyalty_account_id' => $account->id,
                    'type' => 'earn',
                    'points' => $points,
                    'reason' => 'Order delivered: '.$order->order_number,
                    'reference_type' => \App\Models\Order::class,
                    'reference_id' => $order->id,
                    'created_by_type' => null,
                    'created_by_id' => null,
                ]);
            });
        } catch (\Throwable $e) {
            Log::error('[loyalty] earn failed on delivery', [
                'order' => $order->order_number,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
