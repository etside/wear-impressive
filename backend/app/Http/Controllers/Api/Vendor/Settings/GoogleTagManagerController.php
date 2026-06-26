<?php

namespace App\Http\Controllers\Api\Vendor\Settings;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\GoogleTagManagerSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Vendor Settings
 */
class GoogleTagManagerController extends Controller
{
    /**
     * GET /api/vendor/settings/google-tag-manager
     */
    public function show(Request $request): JsonResponse
    {
        $setting = GoogleTagManagerSetting::firstOrCreate(
            ['store_id' => $request->store->id],
            [
                'gtm_id' => null,
                'is_active' => false,
            ]
        );

        return ApiResponse::success($setting);
    }

    /**
     * PATCH /api/vendor/settings/google-tag-manager
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'gtm_id' => ['nullable', 'string', 'max:32'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $setting = GoogleTagManagerSetting::firstOrCreate(['store_id' => $request->store->id]);
        $setting->fill($data)->save();

        return ApiResponse::success($setting->fresh(), 'Google Tag Manager settings saved.');
    }
}
