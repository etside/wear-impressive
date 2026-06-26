<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\CheckoutFieldSetting;
use App\Models\StoreSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Storefront (Public)
 *
 * Exposes the vendor's configured checkout-field settings to the storefront
 * so the customer form can render only what the vendor enabled.
 */
class CheckoutFieldController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $store = $request->attributes->get('store') ?? $request->store ?? null;
        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $fields = CheckoutFieldSetting::where('store_id', $store->id)
            ->where('requirement', '!=', 'hidden')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn ($f) => [
                'field_key' => $f->field_key,
                'field_type' => $f->field_type,
                'label' => $f->label,
                'placeholder' => $f->placeholder,
                'options' => $f->options,
                'requirement' => $f->requirement, // required | optional
                'is_custom' => (bool) $f->is_custom,
                'sort_order' => (int) $f->sort_order,
            ])
            ->values();

        $nameMode = optional(StoreSetting::query()
            ->where('store_id', $store->id)
            ->where('key', 'checkout.name_mode')
            ->first())->value ?? 'split';

        // `full` = single "Full name" input; `split` = First + Last (default).
        $nameMode = in_array($nameMode, ['full', 'split'], true) ? $nameMode : 'split';

        return ApiResponse::success([
            'fields' => $fields,
            'name_mode' => $nameMode,
        ]);
    }
}
