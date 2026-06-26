<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * @group Vendor Dashboard
 */
class StatsController extends Controller
{
    /**
     * GET /api/vendor/stats
     *
     * Dashboard snapshot scoped to the vendor's store.
     */
    public function show(Request $request): JsonResponse
    {
        $storeId = $request->user()->store_id;
        $today = Carbon::today();

        // Today's revenue counts only orders that have been delivered (same
        // recognition rule as the analytics chart). See AnalyticsController
        // for the rationale.
        $todayRevenue = (string) number_format(
            (float) Order::query()
                ->where('store_id', $storeId)
                ->where('status', 'delivered')
                ->whereDate('created_at', $today)
                ->sum('total'),
            2,
            '.',
            ''
        );

        $todayOrders = (int) Order::query()
            ->where('store_id', $storeId)
            ->whereDate('created_at', $today)
            ->count();

        $pendingOrders = (int) Order::query()
            ->where('store_id', $storeId)
            ->where('status', 'pending')
            ->count();

        // Effective stock: for products with variants, sum variant stock;
        // otherwise use the product's own stock column. A product with variants
        // typically keeps `products.stock` at 0 because the variants hold the
        // real inventory — don't flag those as low/out without checking variants.
        $variantSum = '(SELECT COALESCE(SUM(stock), 0) FROM product_variants WHERE product_variants.product_id = products.id)';

        $lowStockProducts = (int) Product::query()
            ->where('store_id', $storeId)
            ->where('track_inventory', true)
            ->where(function ($q) use ($variantSum) {
                $q->where(function ($inner) {
                    $inner->where('has_variants', false)
                        ->whereColumn('stock', '<=', 'low_stock_threshold');
                })->orWhere(function ($inner) use ($variantSum) {
                    $inner->where('has_variants', true)
                        ->whereRaw("{$variantSum} <= low_stock_threshold");
                });
            })
            ->count();

        $recentOrders = Order::query()
            ->where('store_id', $storeId)
            ->with('customer:id,name,email')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        $alerts = $this->buildAlerts($storeId, $pendingOrders, $lowStockProducts);

        return ApiResponse::success([
            'today_revenue' => $todayRevenue,
            'today_orders' => $todayOrders,
            'pending_orders' => $pendingOrders,
            'low_stock_products' => $lowStockProducts,
            'recent_orders' => $recentOrders,
            'alerts' => $alerts,
        ]);
    }

    /**
     * @return array<int, array{type: string, message: string, severity: string}>
     */
    protected function buildAlerts(int $storeId, int $pendingOrders, int $lowStockProducts): array
    {
        $alerts = [];

        $variantSum = '(SELECT COALESCE(SUM(stock), 0) FROM product_variants WHERE product_variants.product_id = products.id)';

        $outOfStock = Product::query()
            ->where('store_id', $storeId)
            ->where('track_inventory', true)
            ->where(function ($q) use ($variantSum) {
                $q->where(function ($inner) {
                    $inner->where('has_variants', false)->where('stock', '<=', 0);
                })->orWhere(function ($inner) use ($variantSum) {
                    $inner->where('has_variants', true)
                        ->whereRaw("{$variantSum} <= 0");
                });
            })
            ->count();

        if ($outOfStock > 0) {
            $alerts[] = [
                'type' => 'out_of_stock',
                'message' => "{$outOfStock} products out of stock",
                'severity' => 'critical',
            ];
        }

        if ($lowStockProducts > 0) {
            $alerts[] = [
                'type' => 'low_stock',
                'message' => "{$lowStockProducts} products running low on stock",
                'severity' => 'warning',
            ];
        }

        if ($pendingOrders > 0) {
            $alerts[] = [
                'type' => 'pending_orders',
                'message' => "{$pendingOrders} orders awaiting action",
                'severity' => 'info',
            ];
        }

        return $alerts;
    }
}
