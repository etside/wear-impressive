<?php

namespace App\Console\Commands;

use App\Events\OrderCancelled;
use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\InventoryLog;
use App\Models\Order;
use App\Models\OrderTimeline;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class ReleaseHeldInventory extends Command
{
    protected $signature = 'wi:release-held-inventory';

    protected $description = 'Release held inventory and cancel stale (>48h) pending COD orders.';

    public function handle(): int
    {
        $cutoff = now()->subHours(48);

        $stale = Order::query()
            ->where('payment_method', 'cod')
            ->where('payment_status', 'pending')
            ->where('status', 'pending')
            ->where('created_at', '<', $cutoff)
            ->with(['items'])
            ->get();

        $this->info("Found {$stale->count()} stale COD orders eligible for cancellation.");

        $cancelled = 0;
        $skipped = 0;
        $itemsRestored = 0;

        foreach ($stale as $order) {
            try {
                $restored = DB::transaction(function () use ($order) {
                    $branchId = $order->branch_id ?? optional(
                        Branch::query()
                            ->where('store_id', $order->store_id)
                            ->where('is_main', true)
                            ->first()
                    )->id ?? optional(
                        Branch::query()
                            ->where('store_id', $order->store_id)
                            ->orderBy('id')
                            ->first()
                    )->id;

                    $restoredItems = 0;

                    foreach ($order->items as $item) {
                        $qty = (int) $item->quantity;
                        if ($qty <= 0) {
                            continue;
                        }

                        if ($branchId) {
                            $stock = BranchStock::lockForUpdate()->firstOrCreate(
                                [
                                    'branch_id' => $branchId,
                                    'product_id' => $item->product_id,
                                    'variant_id' => $item->variant_id,
                                ],
                                ['stock' => 0, 'low_stock_threshold' => 5]
                            );

                            $before = (int) $stock->stock;
                            $after = $before + $qty;
                            $stock->update(['stock' => $after]);
                        } else {
                            $before = 0;
                            $after = $qty;
                        }

                        if ($item->variant_id) {
                            \App\Models\ProductVariant::where('id', $item->variant_id)->increment('stock', $qty);
                        } else {
                            \App\Models\Product::where('id', $item->product_id)->increment('stock', $qty);
                        }

                        InventoryLog::create([
                            'store_id' => $order->store_id,
                            'branch_id' => $branchId,
                            'product_id' => $item->product_id,
                            'variant_id' => $item->variant_id,
                            'type' => 'return',
                            'change_qty' => $qty,
                            'before_qty' => $before,
                            'after_qty' => $after,
                            'reference_type' => 'order',
                            'reference_id' => $order->id,
                            'user_type' => 'system',
                            'user_id' => null,
                            'note' => "Auto-released: order {$order->order_number} cancelled after 48h COD hold.",
                        ]);

                        $restoredItems++;
                    }

                    $order->status = 'cancelled';
                    $order->payment_status = 'cancelled';
                    $order->cancelled_at = now();
                    $order->cancelled_reason = 'Auto-cancelled: stale COD order (>48h unpaid).';
                    $order->save();

                    OrderTimeline::create([
                        'order_id' => $order->id,
                        'event_type' => 'status_change',
                        'title' => 'Order auto-cancelled',
                        'description' => 'Stale COD order automatically cancelled after 48h; inventory released.',
                        'user_type' => 'system',
                        'user_id' => null,
                        'metadata' => [
                            'automated' => true,
                            'reason' => 'release_held_inventory',
                        ],
                    ]);

                    return $restoredItems;
                });

                event(new OrderCancelled($order, 'Auto-cancelled: stale COD order (>48h unpaid).'));

                $cancelled++;
                $itemsRestored += $restored;

                $this->line("  - Cancelled order {$order->order_number} (restored {$restored} item rows)");
            } catch (Throwable $e) {
                $skipped++;
                $this->error("  - Failed to cancel order {$order->id}: ".$e->getMessage());
            }
        }

        $this->info("Cancelled: {$cancelled}, Skipped: {$skipped}, Item rows restored: {$itemsRestored}.");

        return self::SUCCESS;
    }
}
