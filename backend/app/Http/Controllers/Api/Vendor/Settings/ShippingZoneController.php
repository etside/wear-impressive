<?php

namespace App\Http\Controllers\Api\Vendor\Settings;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\ShippingZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Vendor Dashboard
 * @subgroup Settings
 */
class ShippingZoneController extends Controller
{
    /**
     * GET /api/vendor/settings/shipping-zones
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $zones = ShippingZone::where('store_id', $storeId)
            ->orderBy('name')
            ->get();

        return ApiResponse::success($zones);
    }

    /**
     * POST /api/vendor/settings/shipping-zones
     */
    public function store(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'name_bn' => ['nullable', 'string', 'max:255'],
            'districts' => ['nullable', 'array'],
            'coverage' => ['nullable', 'array'],
            'flat_rate' => ['nullable', 'numeric', 'min:0'],
            'free_shipping_threshold' => ['nullable', 'numeric', 'min:0'],
            'delivery_estimate' => ['nullable', 'string', 'max:255'],
            'delivery_estimate_bn' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $data['store_id'] = $storeId;
        $data['flat_rate'] = $data['flat_rate'] ?? 0;
        $data['is_active'] = $data['is_active'] ?? true;

        $zone = ShippingZone::create($data);

        return ApiResponse::success($zone, 'Shipping zone created.', 201);
    }

    /**
     * GET /api/vendor/settings/shipping-zones/{zone}
     */
    public function show(Request $request, ShippingZone $shippingZone): JsonResponse
    {
        $this->authorizeStore($request, $shippingZone);

        return ApiResponse::success($shippingZone);
    }

    /**
     * PUT /api/vendor/settings/shipping-zones/{zone}
     */
    public function update(Request $request, ShippingZone $shippingZone): JsonResponse
    {
        $this->authorizeStore($request, $shippingZone);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'name_bn' => ['nullable', 'string', 'max:255'],
            'districts' => ['nullable', 'array'],
            'coverage' => ['nullable', 'array'],
            'flat_rate' => ['nullable', 'numeric', 'min:0'],
            'free_shipping_threshold' => ['nullable', 'numeric', 'min:0'],
            'delivery_estimate' => ['nullable', 'string', 'max:255'],
            'delivery_estimate_bn' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $shippingZone->update($data);

        return ApiResponse::success($shippingZone->fresh(), 'Shipping zone updated.');
    }

    /**
     * DELETE /api/vendor/settings/shipping-zones/{zone}
     */
    public function destroy(Request $request, ShippingZone $shippingZone): JsonResponse
    {
        $this->authorizeStore($request, $shippingZone);
        $shippingZone->delete();

        return ApiResponse::success(null, 'Shipping zone deleted.');
    }

    protected function authorizeStore(Request $request, ShippingZone $zone): void
    {
        if ($zone->store_id !== $this->currentStoreId($request)) {
            abort(response()->json([
                'success' => false,
                'message' => 'Not found.',
                'data' => null,
            ], 404));
        }
    }
}
