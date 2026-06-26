<?php

namespace App\Console\Commands;

use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Rebuilds the main-branch branch_stock rows so they mirror each product's
 * (or variant's) current stock. Fixes drift introduced before product
 * updates synced branch_stock, and removes phantom variant-parent rows.
 *
 * Idempotent. Run per store: `php artisan wi:resync-branch-stock --store=1`
 * or omit --store to process every store.
 */
class ResyncBranchStock extends Command
{
    protected $signature = 'wi:resync-branch-stock {--store= : Limit to one store id}';

    protected $description = 'Resync main-branch branch_stock from product/variant stock totals.';

    public function handle(): int
    {
        $storeIds = $this->option('store')
            ? [(int) $this->option('store')]
            : Product::query()->distinct()->pluck('store_id')->all();

        foreach ($storeIds as $storeId) {
            $mainBranch = Branch::where('store_id', $storeId)->where('is_main', true)->first()
                ?? Branch::where('store_id', $storeId)->first();

            if (! $mainBranch) {
                $this->warn("Store {$storeId}: no branch, skipped.");
                continue;
            }

            $products = Product::where('store_id', $storeId)
                ->where('product_type', '!=', 'bundle')
                ->with('variants:id,product_id,stock')
                ->get(['id', 'store_id', 'stock', 'low_stock_threshold', 'has_variants', 'product_type']);

            $synced = 0;
            $removed = 0;

            DB::transaction(function () use ($products, $mainBranch, &$synced, &$removed) {
                foreach ($products as $product) {
                    $threshold = $product->low_stock_threshold ?? 5;

                    if ($product->has_variants) {
                        foreach ($product->variants as $variant) {
                            BranchStock::updateOrCreate(
                                ['branch_id' => $mainBranch->id, 'product_id' => $product->id, 'variant_id' => $variant->id],
                                ['stock' => $variant->stock ?? 0, 'low_stock_threshold' => $threshold]
                            );
                            $synced++;
                        }
                        $removed += BranchStock::where('branch_id', $mainBranch->id)
                            ->where('product_id', $product->id)
                            ->whereNull('variant_id')
                            ->delete();
                    } else {
                        BranchStock::updateOrCreate(
                            ['branch_id' => $mainBranch->id, 'product_id' => $product->id, 'variant_id' => null],
                            ['stock' => $product->stock ?? 0, 'low_stock_threshold' => $threshold]
                        );
                        $synced++;
                        $removed += BranchStock::where('branch_id', $mainBranch->id)
                            ->where('product_id', $product->id)
                            ->whereNotNull('variant_id')
                            ->delete();
                    }
                }
            });

            $this->info("Store {$storeId} (branch {$mainBranch->id}): synced {$synced} rows, removed {$removed} phantom/orphan rows.");
        }

        return self::SUCCESS;
    }
}
