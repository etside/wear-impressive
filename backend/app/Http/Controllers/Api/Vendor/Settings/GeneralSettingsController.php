<?php

namespace App\Http\Controllers\Api\Vendor\Settings;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\StoreSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Vendor Dashboard
 * @subgroup Settings
 */
class GeneralSettingsController extends Controller
{
    /**
     * GET /api/vendor/settings/general
     */
    public function show(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        return ApiResponse::success([
            'store' => $store,
            'settings' => StoreSetting::where('store_id', $store?->id)
                ->where('group', 'general')
                ->get(),
        ]);
    }

    /**
     * PATCH /api/vendor/settings/general
     *
     * Updates the store's general/business details and language/currency.
     */
    public function update(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
            'description' => ['nullable', 'string'],
            'address_line_1' => ['nullable', 'string', 'max:255'],
            'division' => ['nullable', 'string', 'max:128'],
            'district' => ['nullable', 'string', 'max:128'],
            'thana' => ['nullable', 'string', 'max:128'],
            'postal_code' => ['nullable', 'string', 'max:32'],
            'timezone' => ['sometimes', 'string', 'max:64'],
            'currency' => ['sometimes', 'string', 'max:8'],
            'primary_language' => ['sometimes', 'in:en,bn,both'],
            'country' => ['sometimes', 'string', 'max:3'],
        ]);

        // weight_unit lives in store_settings table since stores schema doesn't have it.
        $weightUnit = $request->input('weight_unit');

        $store->update($data);

        if ($weightUnit !== null) {
            StoreSetting::updateOrCreate(
                ['store_id' => $store->id, 'key' => 'general.weight_unit'],
                ['value' => (string) $weightUnit, 'type' => 'string', 'group' => 'general']
            );
        }

        return ApiResponse::success($store->fresh(), 'General settings updated.');
    }
}
