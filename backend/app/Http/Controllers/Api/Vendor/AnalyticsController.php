<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    /**
     * Daily revenue series + totals for date range (default last 30 days).
     */
    public function revenue(Request $request): JsonResponse
    {
        $storeId = $request->user()->store_id;
        [$from, $to] = $this->resolveDateRange($request);

        $dateExpr = $this->dateExpr('created_at');

        $rows = Order::query()
            ->selectRaw("{$dateExpr} as date, SUM(total) as revenue, COUNT(*) as orders")
            ->where('store_id', $storeId)
            ->where('status', 'delivered')
            ->whereBetween('created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $series = $rows->map(fn ($r) => [
            'date' => (string) $r->date,
            'revenue' => (float) $r->revenue,
            'orders' => (int) $r->orders,
        ])->values();

        $totalRevenue = (float) $rows->sum('revenue');
        $totalOrders = (int) $rows->sum('orders');
        $avgOrderValue = $totalOrders > 0 ? round($totalRevenue / $totalOrders, 2) : 0.0;

        return ApiResponse::success([
            'series' => $series,
            'total_revenue' => round($totalRevenue, 2),
            'total_orders' => $totalOrders,
            'avg_order_value' => $avgOrderValue,
        ]);
    }

    /**
     * Top 10 products by revenue (delivered orders only).
     */
    public function topProducts(Request $request): JsonResponse
    {
        $storeId = $request->user()->store_id;
        [$from, $to] = $this->resolveDateRange($request);

        $rows = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->selectRaw('order_items.product_id as id, MAX(order_items.product_name) as name, SUM(order_items.quantity) as qty_sold, SUM(order_items.total) as revenue')
            ->where('orders.store_id', $storeId)
            ->where('orders.status', 'delivered')
            ->whereBetween('orders.created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->groupBy('order_items.product_id')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get();

        $products = $rows->map(fn ($r) => [
            'id' => (int) $r->id,
            'name' => (string) $r->name,
            'qty_sold' => (int) $r->qty_sold,
            'revenue' => (float) $r->revenue,
        ])->values();

        return ApiResponse::success([
            'products' => $products,
        ]);
    }

    /**
     * Per-product profit report with CSV export.
     */
    public function profit(Request $request): JsonResponse|\Symfony\Component\HttpFoundation\Response
    {
        $store = $request->store;
        $dateFrom = $request->input('date_from') ?: now()->subDays(30)->toDateString();
        $dateTo = $request->input('date_to') ?: now()->toDateString();
        $categoryId = $request->input('category_id');
        $subCategoryId = $request->input('sub_category_id');

        $itemsQuery = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->where('orders.store_id', $store->id)
            ->where('orders.status', 'delivered')
            ->whereDate('orders.created_at', '>=', $dateFrom)
            ->whereDate('orders.created_at', '<=', $dateTo);

        if ($categoryId) {
            $itemsQuery->where('products.category_id', $categoryId);
        }
        if ($subCategoryId) {
            $itemsQuery->where('products.sub_category_id', $subCategoryId);
        }

        $rows = (clone $itemsQuery)
            ->selectRaw('
                order_items.product_id as id,
                MAX(order_items.product_name) as name,
                MAX(products.category_id) as category_id,
                MAX(products.sub_category_id) as sub_category_id,
                SUM(order_items.quantity) as qty_sold,
                SUM(order_items.total) as revenue,
                SUM(COALESCE(order_items.cost_price_snapshot, 0) * order_items.quantity) as cost
            ')
            ->groupBy('order_items.product_id')
            ->orderByDesc('revenue')
            ->get()
            ->map(function ($r) {
                $revenue = (float) $r->revenue;
                $cost = (float) $r->cost;
                $profit = $revenue - $cost;
                $margin = $revenue > 0 ? round(($profit / $revenue) * 100, 2) : 0.0;
                return [
                    'id' => (int) $r->id,
                    'name' => (string) $r->name,
                    'category_id' => $r->category_id ? (int) $r->category_id : null,
                    'sub_category_id' => $r->sub_category_id ? (int) $r->sub_category_id : null,
                    'qty_sold' => (int) $r->qty_sold,
                    'revenue' => round($revenue, 2),
                    'cost' => round($cost, 2),
                    'profit' => round($profit, 2),
                    'margin' => $margin,
                ];
            })
            ->values()
            ->all();

        $totals = [
            'qty_sold' => array_sum(array_column($rows, 'qty_sold')),
            'revenue' => round(array_sum(array_column($rows, 'revenue')), 2),
            'cost' => round(array_sum(array_column($rows, 'cost')), 2),
            'profit' => round(array_sum(array_column($rows, 'profit')), 2),
        ];
        $totals['margin'] = $totals['revenue'] > 0
            ? round(($totals['profit'] / $totals['revenue']) * 100, 2)
            : 0.0;

        if (strtolower((string) $request->input('format')) === 'csv') {
            $csv = "Product,Qty Sold,Revenue,Cost,Profit,Margin %\n";
            foreach ($rows as $r) {
                $name = '"' . str_replace('"', '""', $r['name']) . '"';
                $csv .= "{$name},{$r['qty_sold']},{$r['revenue']},{$r['cost']},{$r['profit']},{$r['margin']}\n";
            }
            $csv .= "TOTAL,{$totals['qty_sold']},{$totals['revenue']},{$totals['cost']},{$totals['profit']},{$totals['margin']}\n";

            $filename = "wi-profit-{$dateFrom}_to_{$dateTo}.csv";
            return response($csv, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]);
        }

        return ApiResponse::success([
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'rows' => $rows,
            'totals' => $totals,
        ]);
    }

    /**
     * New vs returning customers + top 10 by spend.
     */
    public function customers(Request $request): JsonResponse
    {
        $storeId = $request->user()->store_id;
        [$from, $to] = $this->resolveDateRange($request);

        $newCustomers = (int) Customer::query()
            ->where('store_id', $storeId)
            ->whereBetween('created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->count();

        $returningCustomers = (int) Order::query()
            ->where('store_id', $storeId)
            ->whereNotNull('customer_id')
            ->whereBetween('created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->whereExists(function ($q) use ($from) {
                $q->select(DB::raw(1))
                    ->from('orders as o2')
                    ->whereColumn('o2.customer_id', 'orders.customer_id')
                    ->where('o2.created_at', '<', $from->copy()->startOfDay());
            })
            ->distinct('customer_id')
            ->count('customer_id');

        $topCustomers = Order::query()
            ->selectRaw('customer_id, SUM(total) as total_spent, COUNT(*) as orders_count')
            ->where('store_id', $storeId)
            ->where('status', 'delivered')
            ->whereNotNull('customer_id')
            ->whereBetween('created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->groupBy('customer_id')
            ->orderByDesc('total_spent')
            ->limit(10)
            ->with('customer:id,name,email')
            ->get()
            ->map(fn ($r) => [
                'id' => (int) $r->customer_id,
                'name' => $r->customer?->name,
                'total_spent' => (float) $r->total_spent,
                'orders_count' => (int) $r->orders_count,
            ])
            ->values();

        return ApiResponse::success([
            'new_customers' => $newCustomers,
            'returning_customers' => $returningCustomers,
            'top_customers' => $topCustomers,
        ]);
    }

    /**
     * Payment received report — breakdown by payment method.
     */
    public function paymentReport(Request $request): JsonResponse
    {
        $dateFrom = $request->input('date_from', now()->subDays(30)->toDateString());
        $dateTo   = $request->input('date_to', now()->toDateString());
        $storeId  = $this->currentStoreId($request);

        if (! $storeId) {
            return response()->json(['message' => 'Store not resolved.'], 422);
        }

        $rows = Order::where('store_id', $storeId)
            ->whereIn('payment_status', ['paid', 'partial'])
            ->where('amount_paid', '>', 0)
            ->whereBetween('created_at', [$dateFrom, $dateTo . ' 23:59:59'])
            ->selectRaw(
                "COALESCE(NULLIF(payment_method, ''), 'unknown') as method, " .
                'COUNT(*) as order_count, ' .
                'SUM(amount_paid) as total'
            )
            ->groupBy('method')
            ->orderByDesc('total')
            ->get();

        $grandTotal = (float) $rows->sum('total');

        return response()->json([
            'data' => [
                'date_from'   => $dateFrom,
                'date_to'     => $dateTo,
                'rows'        => $rows,
                'grand_total' => round($grandTotal, 2),
            ],
        ]);
    }

    /**
     * Resolve ?from / ?to (defaults: last 30 days ending today).
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    protected function resolveDateRange(Request $request): array
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $to = isset($data['to']) ? Carbon::parse($data['to']) : Carbon::today();
        $from = isset($data['from']) ? Carbon::parse($data['from']) : $to->copy()->subDays(29);

        if ($from->gt($to)) {
            [$from, $to] = [$to, $from];
        }

        return [$from, $to];
    }

    /**
     * DB-dialect-aware YYYY-MM-DD expression for a datetime column.
     */
    protected function dateExpr(string $column): string
    {
        $driver = DB::connection()->getDriverName();

        return match ($driver) {
            'sqlite' => "strftime('%Y-%m-%d', {$column})",
            'pgsql' => "to_char({$column}, 'YYYY-MM-DD')",
            default => "DATE({$column})",
        };
    }
}
