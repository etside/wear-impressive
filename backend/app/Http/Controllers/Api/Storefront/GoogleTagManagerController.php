<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\GoogleTagManagerSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Storefront — Public
 */
class GoogleTagManagerController extends Controller
{
    /**
     * GET /api/store/google-tag-manager
     * Returns public GTM config (gtm_id only) when active.
     */
    public function config(Request $request): JsonResponse
    {
        $handle = $request->header('X-Store-Handle', 'wi');
        $store = \App\Models\Store::where('handle', $handle)->first();

        if (! $store) {
            return ApiResponse::success(null);
        }

        $setting = GoogleTagManagerSetting::where('store_id', $store->id)
            ->where('is_active', true)
            ->first();

        if (! $setting || empty($setting->gtm_id)) {
            return ApiResponse::success(null);
        }

        return ApiResponse::success([
            'enabled' => true,
            'gtm_id' => $setting->gtm_id,
        ]);
    }
}
