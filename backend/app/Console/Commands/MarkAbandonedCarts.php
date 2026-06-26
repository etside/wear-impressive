<?php

namespace App\Console\Commands;

use App\Models\AbandonedCart;
use App\Models\CartItem;
use App\Models\Customer;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class MarkAbandonedCarts extends Command
{
    protected $signature = 'wi:mark-abandoned-carts';

    protected $description = 'Scan active carts not touched in >1h and upsert abandoned_carts rows.';

    public function handle(): int
    {
        $cutoff = now()->subHour();

        // Group cart_items by (store_id, customer_id) and by (store_id, cart_token)
        $byCustomer = CartItem::query()
            ->whereNotNull('customer_id')
            ->where('updated_at', '<', $cutoff)
            ->selectRaw('store_id, customer_id, MAX(updated_at) as last_activity, SUM(quantity * price_snapshot) as total, COUNT(*) as line_count')
            ->groupBy('store_id', 'customer_id')
            ->get();

        $byToken = CartItem::query()
            ->whereNull('customer_id')
            ->whereNotNull('cart_token')
            ->where('updated_at', '<', $cutoff)
            ->selectRaw('store_id, cart_token, MAX(updated_at) as last_activity, SUM(quantity * price_snapshot) as total, COUNT(*) as line_count')
            ->groupBy('store_id', 'cart_token')
            ->get();

        $marked = 0;

        foreach ($byCustomer as $row) {
            $customer = Customer::find($row->customer_id);
            if (! $customer || ! $customer->email) {
                continue;
            }

            $items = CartItem::where('store_id', $row->store_id)
                ->where('customer_id', $row->customer_id)
                ->get()
                ->map(fn ($ci) => [
                    'product_id' => $ci->product_id,
                    'variant_id' => $ci->variant_id,
                    'quantity' => (int) $ci->quantity,
                    'price' => (float) $ci->price_snapshot,
                ])->toArray();

            if (empty($items)) {
                continue;
            }

            AbandonedCart::updateOrCreate(
                [
                    'store_id' => $row->store_id,
                    'customer_id' => $row->customer_id,
                    'recovered_at' => null,
                ],
                [
                    'items' => $items,
                    'total' => $row->total,
                    'last_activity_at' => $row->last_activity,
                    'recovery_token' => AbandonedCart::where('customer_id', $row->customer_id)
                        ->whereNull('recovered_at')
                        ->value('recovery_token') ?? (string) Str::uuid(),
                ]
            );
            $marked++;
        }

        foreach ($byToken as $row) {
            $items = CartItem::where('store_id', $row->store_id)
                ->where('cart_token', $row->cart_token)
                ->whereNull('customer_id')
                ->get()
                ->map(fn ($ci) => [
                    'product_id' => $ci->product_id,
                    'variant_id' => $ci->variant_id,
                    'quantity' => (int) $ci->quantity,
                    'price' => (float) $ci->price_snapshot,
                ])->toArray();

            if (empty($items)) {
                continue;
            }

            // Guest cart has no email in cart_items table, so we can't dispatch
            // a recovery email. Still, record it for analytics.
            AbandonedCart::updateOrCreate(
                [
                    'store_id' => $row->store_id,
                    'recovery_token' => $row->cart_token,
                ],
                [
                    'items' => $items,
                    'total' => $row->total,
                    'last_activity_at' => $row->last_activity,
                ]
            );
            $marked++;
        }

        $this->info("Marked/updated {$marked} abandoned cart(s).");

        return self::SUCCESS;
    }
}
