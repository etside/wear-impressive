<?php

namespace App\Http\Controllers\Api\Vendor\Settings;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\PaymentMethod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;

/**
 * @group Vendor Dashboard
 * @subgroup Settings
 */
class PaymentMethodController extends Controller
{
    /**
     * GET /api/vendor/settings/payment-methods
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $methods = PaymentMethod::where('store_id', $storeId)
            ->orderBy('sort_order')
            ->get();

        return ApiResponse::success($methods);
    }

    /**
     * PATCH /api/vendor/settings/payment-methods/{method}
     *
     * Update credentials, is_active, is_test_mode. Credentials are encrypted before persistence.
     */
    public function update(Request $request, PaymentMethod $paymentMethod): JsonResponse
    {
        $this->authorizeStore($request, $paymentMethod);

        $data = $request->validate([
            'display_name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'credentials' => ['nullable', 'array'],
            'is_active' => ['sometimes', 'boolean'],
            'is_test_mode' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer'],
            'metadata' => ['nullable', 'array'],
        ]);

        if (array_key_exists('credentials', $data)) {
            $creds = $data['credentials'];
            $data['credentials_encrypted'] = $creds === null ? null : Crypt::encryptString(json_encode($creds));
            unset($data['credentials']);
        }

        $paymentMethod->update($data);

        return ApiResponse::success($paymentMethod->fresh(), 'Payment method updated.');
    }

    protected function authorizeStore(Request $request, PaymentMethod $method): void
    {
        if ($method->store_id !== $this->currentStoreId($request)) {
            abort(response()->json([
                'success' => false,
                'message' => 'Not found.',
                'data' => null,
            ], 404));
        }
    }
}
