<?php

namespace App\Http\Controllers\Api\Vendor\Settings;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\StoreSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * @group Vendor Dashboard
 * @subgroup Settings
 */
class BrandingController extends Controller
{
    /**
     * PATCH /api/vendor/settings/branding
     *
     * Handles logo, favicon, social share banner, and brand colors (primary +
     * accent). Colors are mirrored into the theme.overrides store setting so
     * both this page and the theme customizer see the same values.
     */
    public function update(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        $request->validate([
            'logo' => ['nullable'],
            'favicon' => ['nullable'],
            'social_banner' => ['nullable'],
            'description' => ['nullable', 'string'],
            'primary_color' => ['nullable', 'string', 'max:16'],
            'accent_color' => ['nullable', 'string', 'max:16'],
            'remove_logo' => ['nullable', 'boolean'],
            'remove_favicon' => ['nullable', 'boolean'],
            'remove_social_banner' => ['nullable', 'boolean'],
        ]);

        $payload = [];

        /* ── Logo ─────────────────────────────────────────── */
        if ($request->boolean('remove_logo') && $store->logo) {
            Storage::disk('public')->delete($store->logo);
            $payload['logo'] = null;
        } elseif ($request->hasFile('logo')) {
            if ($store->logo) Storage::disk('public')->delete($store->logo);
            $payload['logo'] = $request->file('logo')->store("stores/{$store->id}/branding", 'public');
        }

        /* ── Favicon ──────────────────────────────────────── */
        if ($request->boolean('remove_favicon') && $store->favicon) {
            Storage::disk('public')->delete($store->favicon);
            $payload['favicon'] = null;
        } elseif ($request->hasFile('favicon')) {
            if ($store->favicon) Storage::disk('public')->delete($store->favicon);
            $payload['favicon'] = $request->file('favicon')->store("stores/{$store->id}/branding", 'public');
        }

        if ($request->has('description')) {
            $payload['description'] = $request->input('description');
        }

        if (! empty($payload)) {
            $store->update($payload);
        }

        /* ── Social share banner (stored as a setting path) ─ */
        $bannerSetting = StoreSetting::where('store_id', $store->id)
            ->where('key', 'branding.social_banner')
            ->first();
        $currentBanner = $bannerSetting?->value;

        if ($request->boolean('remove_social_banner')) {
            if ($currentBanner) Storage::disk('public')->delete($currentBanner);
            if ($bannerSetting) $bannerSetting->delete();
            $currentBanner = null;
        } elseif ($request->hasFile('social_banner')) {
            if ($currentBanner) Storage::disk('public')->delete($currentBanner);
            $path = $request->file('social_banner')->store("stores/{$store->id}/branding", 'public');
            StoreSetting::updateOrCreate(
                ['store_id' => $store->id, 'key' => 'branding.social_banner'],
                ['value' => $path, 'type' => 'string', 'group' => 'branding']
            );
            $currentBanner = $path;
        }

        /* ── Colors → mirror into theme.overrides ─────────── */
        if ($request->filled('primary_color') || $request->filled('accent_color')) {
            $existing = StoreSetting::where('store_id', $store->id)
                ->where('key', 'theme.overrides')
                ->first();
            $overrides = [];
            if ($existing?->value) {
                $decoded = json_decode((string) $existing->value, true);
                if (is_array($decoded)) $overrides = $decoded;
            }
            if ($request->filled('primary_color')) $overrides['primaryColor'] = $request->input('primary_color');
            if ($request->filled('accent_color'))  $overrides['accentColor']  = $request->input('accent_color');

            StoreSetting::updateOrCreate(
                ['store_id' => $store->id, 'key' => 'theme.overrides'],
                ['value' => json_encode($overrides), 'type' => 'json', 'group' => 'theme']
            );
        }

        $store->refresh();

        return ApiResponse::success([
            'store' => $store,
            'logo_url' => $store->logo ? Storage::disk('public')->url($store->logo) : null,
            'favicon_url' => $store->favicon ? Storage::disk('public')->url($store->favicon) : null,
            'social_banner_url' => $currentBanner ? Storage::disk('public')->url($currentBanner) : null,
        ], 'Branding updated.');
    }
}
