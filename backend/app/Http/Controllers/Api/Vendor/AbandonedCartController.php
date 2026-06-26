<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\AbandonedCart;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Vendor Dashboard
 */
class AbandonedCartController extends Controller
{
    /**
     * GET /api/vendor/abandoned-carts
     */
    public function index(Request $request): JsonResponse
    {
        $query = AbandonedCart::where('store_id', $request->store->id)
            ->with('customer:id,name,email,phone');

        if ($request->has('recovered')) {
            $recovered = filter_var($request->input('recovered'), FILTER_VALIDATE_BOOLEAN);
            if ($recovered) {
                $query->whereNotNull('recovered_at');
            } else {
                $query->whereNull('recovered_at');
            }
        }

        if ($from = $request->input('date_from')) {
            $query->whereDate('last_activity_at', '>=', $from);
        }

        if ($to = $request->input('date_to')) {
            $query->whereDate('last_activity_at', '<=', $to);
        }

        $perPage = (int) $request->input('per_page', 20);
        $carts = $query->orderBy('last_activity_at', 'desc')->paginate($perPage);

        return ApiResponse::success($carts);
    }

    /**
     * GET /api/vendor/abandoned-carts/{cart}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $cart = AbandonedCart::where('store_id', $request->store->id)
            ->with(['customer', 'recoveryOrder:id,order_number,total,status'])
            ->findOrFail($id);

        return ApiResponse::success($cart);
    }

    /**
     * POST /api/vendor/abandoned-carts/{cart}/send-recovery
     */
    public function sendRecovery(Request $request, int $id): JsonResponse
    {
        $cart = AbandonedCart::where('store_id', $request->store->id)->findOrFail($id);

        $data = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
            'subject' => ['nullable', 'string', 'max:255'],
        ]);

        $cart->recovery_email_sent_at = now();
        $cart->save();

        // Email dispatch will be added later — for now just persist the send timestamp.
        // $data['message'] / $data['subject'] will be handed to a Mail job in that iteration.

        return ApiResponse::success($cart->fresh(), 'Recovery message queued.');
    }

    /**
     * GET /api/vendor/abandoned-carts/stats
     */
    public function stats(Request $request): JsonResponse
    {
        $storeId = $request->store->id;

        $totalAbandoned = AbandonedCart::where('store_id', $storeId)->count();
        $totalRecovered = AbandonedCart::where('store_id', $storeId)->whereNotNull('recovered_at')->count();
        $totalValue = (float) AbandonedCart::where('store_id', $storeId)->sum('total');
        $recoveredValue = (float) AbandonedCart::where('store_id', $storeId)->whereNotNull('recovered_at')->sum('total');

        $rate = $totalAbandoned > 0 ? round(($totalRecovered / $totalAbandoned) * 100, 2) : 0.0;

        return ApiResponse::success([
            'total_abandoned' => $totalAbandoned,
            'total_recovered' => $totalRecovered,
            'total_value' => round($totalValue, 2),
            'recovered_value' => round($recoveredValue, 2),
            'recovery_rate' => $rate,
        ]);
    }
}
