<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\NavigationMenu;
use App\Models\Store;
use App\Models\StoreSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Storefront (Public)
 */
class StoreInfoController extends Controller
{
    /**
     * GET /api/store/info
     */
    public function show(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $settings = StoreSetting::query()
            ->where('store_id', $store->id)
            ->get()
            ->keyBy('key')
            ->map(function ($setting) {
                $value = $setting->value;

                return match ($setting->type) {
                    'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
                    'integer' => (int) $value,
                    'decimal' => (float) $value,
                    'json' => is_string($value) ? json_decode($value, true) : $value,
                    default => $value,
                };
            });

        $menus = NavigationMenu::query()
            ->where('store_id', $store->id)
            ->get(['id', 'name', 'handle', 'items'])
            ->keyBy('handle');

        return ApiResponse::success([
            'store' => [
                'id' => $store->id,
                'name' => $store->name,
                'handle' => $store->handle,
                'custom_domain' => $store->custom_domain,
                'email' => $store->email,
                'phone' => $store->phone,
                'country' => $store->country,
                'currency' => $store->currency,
                'timezone' => $store->timezone,
                'primary_language' => $store->primary_language,
                'logo' => $store->logo,
                'favicon' => $store->favicon,
                'description' => $store->description,
                // Flat address fields — matches the frontend Store type. Kept
                // alongside the nested `address` object so older callers that
                // read `store.address.*` continue to work during rollout.
                'address_line_1' => $store->address_line_1,
                'division' => $store->division,
                'district' => $store->district,
                'thana' => $store->thana,
                'postal_code' => $store->postal_code,
                'address' => [
                    'address_line_1' => $store->address_line_1,
                    'division' => $store->division,
                    'district' => $store->district,
                    'thana' => $store->thana,
                    'postal_code' => $store->postal_code,
                ],
            ],
            'theme' => $store->activeTheme,
            'settings' => $settings,
            'menus' => $menus,
        ], 'Store info loaded.');
    }

    /**
     * GET /api/shops
     *
     * Public directory of every active store on the platform. Unlike `show()`
     * this endpoint doesn't require a resolved store context — it powers the
     * /shops landing page.
     */
    public function directory(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Store::query()
            ->where('status', 'active')
            ->withCount(['products' => function ($q) {
                $q->where('is_active', true);
            }]);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('handle', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $stores = $query
            ->orderBy('name')
            ->paginate((int) $request->input('per_page', 24));

        return ApiResponse::success($stores, 'Shops loaded.');
    }
}
