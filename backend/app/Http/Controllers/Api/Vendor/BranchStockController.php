<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\InventoryLog;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * @group Vendor Dashboard
 */
class BranchStockController extends Controller
{
    /**
     * GET /api/vendor/branches/{branch}/stock
     */
    public function index(Request $request, Branch $branch): JsonResponse
    {
        $this->assertBranchInStore($request, $branch);

        // A variant product tracks stock per-variant, so its parent row
        // (variant_id = null) is a phantom that should never be listed or
        // counted — otherwise it shows up as a bogus 0-stock "out of stock"
        // entry. Keep: variant rows, plus parent rows of non-variant products.
        $excludeVariantParents = function ($q) {
            $q->whereNotNull('variant_id')
                ->orWhereHas('product', fn ($p) => $p->where('has_variants', false));
        };

        $query = BranchStock::query()
            ->with(['product:id,name,sku,barcode,has_variants,stock,featured_image,images', 'variant:id,product_id,sku,options,stock,image'])
            ->where('branch_id', $branch->id)
            ->where($excludeVariantParents);

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->integer('product_id'));
        }

        if ($request->filled('low_only') && $request->boolean('low_only')) {
            $query->whereColumn('stock', '<=', 'low_stock_threshold');
        }

        if ($request->filled('q')) {
            $q = $request->string('q');
            $query->whereHas('product', function ($w) use ($q) {
                $w->where('name', 'like', "%{$q}%")
                    ->orWhere('sku', 'like', "%{$q}%")
                    ->orWhere('barcode', 'like', "%{$q}%");
            });
        }

        $paginated = $query->orderByDesc('id')->paginate(
            (int) $request->integer('per_page', 30)
        );

        // Aggregate counts across the whole branch — not just the current page —
        // so the dashboard summary cards reflect the full inventory.
        $countsQuery = BranchStock::query()
            ->where('branch_id', $branch->id)
            ->where($excludeVariantParents);
        $totalRows = (clone $countsQuery)->count();
        $outOfStock = (clone $countsQuery)->where('stock', '<=', 0)->count();
        $lowStock = (clone $countsQuery)
            ->whereColumn('stock', '<=', 'low_stock_threshold')
            ->where('stock', '>', 0)
            ->count();
        $inStock = $totalRows - $outOfStock - $lowStock;

        // Flatten product/variant relations into fields the frontend expects.
        $paginated->getCollection()->transform(function ($row) {
            $product = $row->product;
            $variant = $row->variant;
            $row->product_name = $product?->name ?? null;
            $row->sku = $variant?->sku ?? $product?->sku ?? null;
            if ($variant) {
                $opts = is_array($variant->options) ? $variant->options : [];
                $row->variant_label = empty($opts)
                    ? ($variant->sku ?? null)
                    : implode(' / ', array_values($opts));
            } else {
                $row->variant_label = null;
            }
            return $row;
        });

        $out = $paginated->toArray();
        $out['counts'] = [
            'total' => $totalRows,
            'in_stock' => max(0, $inStock),
            'low_stock' => $lowStock,
            'out_of_stock' => $outOfStock,
        ];

        return ApiResponse::success($out);
    }

    /**
     * POST /api/vendor/branches/{branch}/stock/adjust
     *
     * Required: product_id, variant_id (nullable), change_qty (+/-), note.
     */
    public function adjust(Request $request, Branch $branch): JsonResponse
    {
        $this->assertBranchInStore($request, $branch);

        $store = $request->store;

        $data = $request->validate([
            'product_id' => ['required', 'integer'],
            'variant_id' => ['nullable', 'integer'],
            'change_qty' => ['required', 'integer', 'not_in:0'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $product = Product::where('store_id', $store->id)
            ->findOrFail($data['product_id']);

        $variant = null;
        if (! empty($data['variant_id'])) {
            $variant = ProductVariant::where('product_id', $product->id)
                ->findOrFail($data['variant_id']);
        }

        $result = DB::transaction(function () use ($store, $branch, $product, $variant, $data, $request) {
            $stock = BranchStock::lockForUpdate()
                ->firstOrCreate(
                    [
                        'branch_id' => $branch->id,
                        'product_id' => $product->id,
                        'variant_id' => $variant?->id,
                    ],
                    ['stock' => 0, 'low_stock_threshold' => 5]
                );

            $beforeQty = (int) $stock->stock;
            $afterQty = $beforeQty + (int) $data['change_qty'];

            if ($afterQty < 0) {
                abort(422, 'Adjustment would make stock negative.');
            }

            $stock->update(['stock' => $afterQty]);

            // Update aggregate stock on product / variant.
            if ($variant) {
                $variant->increment('stock', (int) $data['change_qty']);
            } else {
                $product->increment('stock', (int) $data['change_qty']);
            }

            $user = auth()->user();
            $guard = $this->currentGuard();

            $log = InventoryLog::create([
                'store_id' => $store->id,
                'branch_id' => $branch->id,
                'product_id' => $product->id,
                'variant_id' => $variant?->id,
                'type' => 'adjustment',
                'change_qty' => (int) $data['change_qty'],
                'before_qty' => $beforeQty,
                'after_qty' => $afterQty,
                'reference_type' => Branch::class,
                'reference_id' => $branch->id,
                'user_type' => $guard,
                'user_id' => $user?->id,
                'note' => $data['note'] ?? null,
            ]);

            return compact('stock', 'log');
        });

        return ApiResponse::success($result, 'Stock adjusted.');
    }

    private function assertBranchInStore(Request $request, Branch $branch): void
    {
        abort_if($branch->store_id !== $request->store->id, 404, 'Branch not found.');
    }

    private function currentGuard(): ?string
    {
        foreach (['vendor', 'staff'] as $guard) {
            if (auth($guard)->check()) {
                return $guard;
            }
        }

        return null;
    }
}
