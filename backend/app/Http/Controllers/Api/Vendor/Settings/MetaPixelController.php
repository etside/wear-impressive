<?php

namespace App\Http\Controllers\Api\Vendor\Settings;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\MetaPixelSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Vendor Settings
 */
class MetaPixelController extends Controller
{
    /**
     * GET /api/vendor/settings/meta-pixel
     */
    public function show(Request $request): JsonResponse
    {
        $setting = MetaPixelSetting::firstOrCreate(
            ['store_id' => $request->store->id],
            [
                'pixel_id' => null,
                'access_token' => null,
                'is_active' => false,
                'track_view_content' => true,
                'track_add_to_cart' => true,
                'track_initiate_checkout' => true,
                'track_purchase' => true,
                'use_conversions_api' => false,
                'test_event_code' => null,
            ]
        );

        // Show whether a token is saved without exposing it.
        return ApiResponse::success(array_merge($setting->toArray(), [
            'has_access_token' => ! empty($setting->getAttributes()['access_token']),
        ]));
    }

    /**
     * PATCH /api/vendor/settings/meta-pixel
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pixel_id' => ['nullable', 'string', 'max:64'],
            'access_token' => ['nullable', 'string', 'max:500'],
            'is_active' => ['nullable', 'boolean'],
            'track_view_content' => ['nullable', 'boolean'],
            'track_add_to_cart' => ['nullable', 'boolean'],
            'track_initiate_checkout' => ['nullable', 'boolean'],
            'track_purchase' => ['nullable', 'boolean'],
            'use_conversions_api' => ['nullable', 'boolean'],
            'test_event_code' => ['nullable', 'string', 'max:32'],
        ]);

        $setting = MetaPixelSetting::firstOrCreate(['store_id' => $request->store->id]);

        // Only update access_token when explicitly sent (non-null).
        if (! array_key_exists('access_token', $data) || $data['access_token'] === null) {
            unset($data['access_token']);
        }

        $setting->fill($data)->save();

        return ApiResponse::success(array_merge($setting->fresh()->toArray(), [
            'has_access_token' => ! empty($setting->fresh()->getAttributes()['access_token']),
        ]), 'Meta Pixel settings saved.');
    }

    /**
     * DELETE /api/vendor/settings/meta-pixel/token
     * Clears the CAPI access token without touching other settings.
     */
    public function clearToken(Request $request): JsonResponse
    {
        MetaPixelSetting::where('store_id', $request->store->id)
            ->update(['access_token' => null, 'use_conversions_api' => false]);

        return ApiResponse::success(null, 'Access token removed.');
    }
}
