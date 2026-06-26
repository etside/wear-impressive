<?php

namespace App\Http\Controllers\Api\Vendor\Settings;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\TaxRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Vendor Dashboard
 * @subgroup Settings
 */
class TaxRuleController extends Controller
{
    /**
     * GET /api/vendor/settings/tax-rules
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $rules = TaxRule::where('store_id', $storeId)
            ->orderBy('name')
            ->get();

        return ApiResponse::success($rules);
    }

    /**
     * POST /api/vendor/settings/tax-rules
     */
    public function store(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'country' => ['nullable', 'string', 'max:3'],
            'region' => ['nullable', 'string', 'max:128'],
            'applies_to' => ['nullable', 'in:all,categories,products'],
            'category_ids' => ['nullable', 'array'],
            'is_inclusive' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $data['store_id'] = $storeId;
        $data['country'] = $data['country'] ?? 'BD';
        $data['applies_to'] = $data['applies_to'] ?? 'all';
        $data['is_active'] = $data['is_active'] ?? true;

        $rule = TaxRule::create($data);

        return ApiResponse::success($rule, 'Tax rule created.', 201);
    }

    /**
     * GET /api/vendor/settings/tax-rules/{rule}
     */
    public function show(Request $request, TaxRule $taxRule): JsonResponse
    {
        $this->authorizeStore($request, $taxRule);

        return ApiResponse::success($taxRule);
    }

    /**
     * PUT /api/vendor/settings/tax-rules/{rule}
     */
    public function update(Request $request, TaxRule $taxRule): JsonResponse
    {
        $this->authorizeStore($request, $taxRule);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'rate' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'country' => ['nullable', 'string', 'max:3'],
            'region' => ['nullable', 'string', 'max:128'],
            'applies_to' => ['sometimes', 'in:all,categories,products'],
            'category_ids' => ['nullable', 'array'],
            'is_inclusive' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $taxRule->update($data);

        return ApiResponse::success($taxRule->fresh(), 'Tax rule updated.');
    }

    /**
     * DELETE /api/vendor/settings/tax-rules/{rule}
     */
    public function destroy(Request $request, TaxRule $taxRule): JsonResponse
    {
        $this->authorizeStore($request, $taxRule);
        $taxRule->delete();

        return ApiResponse::success(null, 'Tax rule deleted.');
    }

    protected function authorizeStore(Request $request, TaxRule $rule): void
    {
        if ($rule->store_id !== $this->currentStoreId($request)) {
            abort(response()->json([
                'success' => false,
                'message' => 'Not found.',
                'data' => null,
            ], 404));
        }
    }
}
