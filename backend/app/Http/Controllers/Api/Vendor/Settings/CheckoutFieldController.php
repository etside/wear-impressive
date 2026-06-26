<?php

namespace App\Http\Controllers\Api\Vendor\Settings;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\CheckoutFieldSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * @group Vendor Dashboard
 * @subgroup Settings
 */
class CheckoutFieldController extends Controller
{
    /**
     * GET /api/vendor/settings/checkout-fields
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $fields = CheckoutFieldSetting::where('store_id', $storeId)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return ApiResponse::success($fields);
    }

    /**
     * PUT /api/vendor/settings/checkout-fields
     *
     * Body: { fields: [ { field_key, field_type, label?, placeholder?, options?, requirement?, is_custom?, sort_order? } ] }
     * Upserts by field_key within the store.
     */
    public function update(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $data = $request->validate([
            'fields' => ['required', 'array'],
            'fields.*.field_key' => ['required', 'string', 'max:128'],
            'fields.*.field_type' => ['nullable', 'in:text,number,email,phone,url,select,radio,checkbox,date,textarea,attachment'],
            'fields.*.label' => ['nullable', 'string', 'max:255'],
            'fields.*.placeholder' => ['nullable', 'string', 'max:255'],
            'fields.*.options' => ['nullable', 'array'],
            'fields.*.requirement' => ['nullable', 'in:hidden,optional,required'],
            'fields.*.is_custom' => ['nullable', 'boolean'],
            'fields.*.sort_order' => ['nullable', 'integer'],
        ]);

        DB::transaction(function () use ($data, $storeId) {
            foreach ($data['fields'] as $row) {
                CheckoutFieldSetting::updateOrCreate(
                    ['store_id' => $storeId, 'field_key' => $row['field_key']],
                    [
                        'field_type' => $row['field_type'] ?? 'text',
                        'label' => $row['label'] ?? null,
                        'placeholder' => $row['placeholder'] ?? null,
                        'options' => $row['options'] ?? null,
                        'requirement' => $row['requirement'] ?? 'optional',
                        'is_custom' => $row['is_custom'] ?? false,
                        'sort_order' => $row['sort_order'] ?? 0,
                    ]
                );
            }
        });

        $fields = CheckoutFieldSetting::where('store_id', $storeId)
            ->orderBy('sort_order')
            ->get();

        return ApiResponse::success($fields, 'Checkout fields updated.');
    }
}
