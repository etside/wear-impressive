<?php

namespace App\Http\Controllers\Api\Vendor\Settings;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\DeliveryPartner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;

/**
 * @group Vendor Dashboard
 * @subgroup Settings
 */
class DeliveryPartnerController extends Controller
{
    /**
     * GET /api/vendor/settings/delivery-partners
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $partners = DeliveryPartner::where('store_id', $storeId)
            ->orderBy('display_name')
            ->get();

        return ApiResponse::success($partners);
    }

    /**
     * PATCH /api/vendor/settings/delivery-partners/{partner}
     *
     * Update credentials (encrypted), settings, and toggles.
     */
    public function update(Request $request, DeliveryPartner $deliveryPartner): JsonResponse
    {
        $this->authorizeStore($request, $deliveryPartner);

        $data = $request->validate([
            'display_name' => ['sometimes', 'string', 'max:255'],
            'credentials' => ['nullable', 'array'],
            'settings' => ['nullable', 'array'],
            'is_active' => ['sometimes', 'boolean'],
            'is_test_mode' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('credentials', $data)) {
            $creds = $data['credentials'];
            $data['credentials_encrypted'] = $creds === null ? null : Crypt::encryptString(json_encode($creds));
            unset($data['credentials']);
        }

        $deliveryPartner->update($data);

        return ApiResponse::success($deliveryPartner->fresh(), 'Delivery partner updated.');
    }

    protected function authorizeStore(Request $request, DeliveryPartner $partner): void
    {
        if ($partner->store_id !== $this->currentStoreId($request)) {
            abort(response()->json([
                'success' => false,
                'message' => 'Not found.',
                'data' => null,
            ], 404));
        }
    }
}
