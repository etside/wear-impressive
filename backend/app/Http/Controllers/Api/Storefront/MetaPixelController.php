<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\MetaPixelSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * @group Storefront (Public)
 */
class MetaPixelController extends Controller
{
    /**
     * GET /api/store/meta-pixel
     *
     * Returns the public pixel config (pixel_id + track_* flags). Never
     * exposes the access token — that stays server-side only.
     */
    public function config(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context required.', 400);
        }

        $setting = MetaPixelSetting::where('store_id', $store->id)
            ->where('is_active', true)
            ->first();

        if (! $setting || ! $setting->pixel_id) {
            return ApiResponse::success(['enabled' => false]);
        }

        return ApiResponse::success([
            'enabled' => true,
            'pixel_id' => $setting->pixel_id,
            'track_view_content' => $setting->track_view_content,
            'track_add_to_cart' => $setting->track_add_to_cart,
            'track_initiate_checkout' => $setting->track_initiate_checkout,
            'track_purchase' => $setting->track_purchase,
        ]);
    }

    /**
     * POST /api/store/meta-pixel/event
     *
     * Server-side Conversions API relay. The storefront posts an event here;
     * we forward it to Meta if CAPI is configured. Events must be deduped by
     * the caller via `event_id`.
     */
    public function event(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);
        if (! $store) {
            return ApiResponse::error('Store context required.', 400);
        }

        $data = $request->validate([
            'event_name' => ['required', 'string', 'max:64'],
            'event_id' => ['required', 'string', 'max:128'],
            'event_source_url' => ['nullable', 'string', 'max:500'],
            'value' => ['nullable', 'numeric'],
            'currency' => ['nullable', 'string', 'max:8'],
            'content_ids' => ['nullable', 'array'],
            'content_type' => ['nullable', 'string', 'max:32'],
            'user_data' => ['nullable', 'array'],
        ]);

        $setting = MetaPixelSetting::where('store_id', $store->id)
            ->where('is_active', true)
            ->where('use_conversions_api', true)
            ->first();

        // No CAPI configured — acknowledge silently (browser pixel handles it).
        if (! $setting || ! $setting->pixel_id) {
            return ApiResponse::success(['forwarded' => false]);
        }

        $token = $setting->getAttributes()['access_token'] ?? null;
        if (! $token) {
            return ApiResponse::success(['forwarded' => false]);
        }

        $eventData = [
            'event_name' => $data['event_name'],
            'event_id' => $data['event_id'],
            'event_time' => time(),
            'event_source_url' => $data['event_source_url'] ?? $request->header('Referer'),
            'action_source' => 'website',
            'custom_data' => array_filter([
                'value' => $data['value'] ?? null,
                'currency' => $data['currency'] ?? 'BDT',
                'content_ids' => $data['content_ids'] ?? null,
                'content_type' => $data['content_type'] ?? null,
            ]),
        ];

        // Hash user data per Meta requirements.
        $ud = $data['user_data'] ?? [];
        $hashed = [];
        foreach (['em', 'ph'] as $field) {
            if (! empty($ud[$field])) {
                $hashed[$field] = hash('sha256', strtolower(trim((string) $ud[$field])));
            }
        }
        if ($hashed) {
            $eventData['user_data'] = $hashed;
        }

        $payload = ['data' => [$eventData]];
        if ($setting->test_event_code) {
            $payload['test_event_code'] = $setting->test_event_code;
        }

        try {
            Http::timeout(5)
                ->post("https://graph.facebook.com/v19.0/{$setting->pixel_id}/events?access_token={$token}", $payload);
        } catch (\Throwable $e) {
            Log::warning('[meta_pixel] CAPI send failed', ['error' => $e->getMessage()]);
        }

        return ApiResponse::success(['forwarded' => true]);
    }
}
