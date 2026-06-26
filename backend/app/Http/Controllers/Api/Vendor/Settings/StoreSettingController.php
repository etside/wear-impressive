<?php

namespace App\Http\Controllers\Api\Vendor\Settings;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\StoreSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * @group Vendor Dashboard
 * @subgroup Settings
 */
class StoreSettingController extends Controller
{
    /**
     * GET /api/vendor/settings
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $query = StoreSetting::where('store_id', $storeId);

        if ($group = $request->query('group')) {
            $query->where('group', $group);
        }

        $settings = $query->orderBy('group')->orderBy('key')->get();

        return ApiResponse::success($settings);
    }

    /**
     * PUT /api/vendor/settings
     * Body: { settings: [ { key, value, type?, group? }, ... ] }
     * Upserts each row.
     */
    public function update(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $data = $request->validate([
            'settings' => ['required', 'array', 'min:1'],
            'settings.*.key' => ['required', 'string', 'max:255'],
            'settings.*.value' => ['nullable'],
            'settings.*.type' => ['nullable', 'in:string,boolean,integer,decimal,json'],
            'settings.*.group' => ['nullable', 'in:general,checkout,notifications,security,seo,branding,theme,payments,policies,marketing'],
        ]);

        DB::transaction(function () use ($data, $storeId) {
            foreach ($data['settings'] as $row) {
                $value = $row['value'] ?? null;
                if (is_array($value) || is_object($value)) {
                    $value = json_encode($value);
                } elseif (is_bool($value)) {
                    $value = $value ? '1' : '0';
                } elseif ($value !== null) {
                    $value = (string) $value;
                }

                StoreSetting::updateOrCreate(
                    ['store_id' => $storeId, 'key' => $row['key']],
                    [
                        'value' => $value,
                        'type' => $row['type'] ?? 'string',
                        'group' => $row['group'] ?? 'general',
                    ]
                );
            }
        });

        $settings = StoreSetting::where('store_id', $storeId)->get();

        return ApiResponse::success($settings, 'Settings updated.');
    }
}
