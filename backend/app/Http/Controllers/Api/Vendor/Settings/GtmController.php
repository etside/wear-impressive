<?php

namespace App\Http\Controllers\Api\Vendor\Settings;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\GtmSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GtmController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $storeId = $request->user()->store_id;
        $setting = GtmSetting::firstOrCreate(
            ['store_id' => $storeId],
            ['is_active' => false, 'gtm_id' => null]
        );

        return ApiResponse::success($setting);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'gtm_id' => ['nullable', 'string', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $storeId = $request->user()->store_id;
        $setting = GtmSetting::firstOrCreate(
            ['store_id' => $storeId],
            ['is_active' => false, 'gtm_id' => null]
        );

        $setting->update($validated);

        return ApiResponse::success($setting, 'GTM settings updated');
    }
}
