<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\GtmSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GtmController extends Controller
{
    public function config(Request $request): JsonResponse
    {
        $store = app('store');
        if (!$store) {
            return ApiResponse::error('Store not found', 404);
        }

        $setting = GtmSetting::where('store_id', $store->id)
            ->where('is_active', true)
            ->first();

        if (!$setting || !$setting->gtm_id) {
            return ApiResponse::success(['enabled' => false]);
        }

        return ApiResponse::success([
            'enabled' => true,
            'gtm_id' => $setting->gtm_id,
        ]);
    }
}
