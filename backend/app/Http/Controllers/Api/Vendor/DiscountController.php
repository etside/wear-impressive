<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Discount;
use App\Models\DiscountUsage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

/**
 * @group Vendor Dashboard
 */
class DiscountController extends Controller
{
    /**
     * GET /api/vendor/discounts
     * Filters: is_active, type, expiring_soon
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $query = Discount::where('store_id', $storeId);

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($request->boolean('expiring_soon')) {
            $query->whereBetween('end_date', [now(), now()->addDays(7)])
                ->where('is_active', true);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->query('per_page', 20);
        $discounts = $query->orderByDesc('created_at')->paginate($perPage);

        return ApiResponse::success($discounts);
    }

    /**
     * POST /api/vendor/discounts
     */
    public function store(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $data = $request->validate([
            'code' => [
                'required', 'string', 'max:64',
                Rule::unique('discounts', 'code')
                    ->where(fn ($q) => $q->where('store_id', $storeId)->whereNull('deleted_at')),
            ],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:percentage,fixed,free_shipping,bogo'],
            'value' => ['required', 'numeric', 'min:0'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'minimum_amount' => ['nullable', 'numeric', 'min:0'],
            'maximum_discount' => ['nullable', 'numeric', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'usage_per_customer' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['nullable', 'boolean'],
            'applies_to' => ['nullable', 'in:all,products,collections,categories'],
            'eligible_product_ids' => ['nullable', 'array'],
            'eligible_collection_ids' => ['nullable', 'array'],
            'eligible_category_ids' => ['nullable', 'array'],
            'excluded_product_ids' => ['nullable', 'array'],
            'customer_eligibility' => ['nullable', 'in:all,specific,segments'],
            'eligible_customer_ids' => ['nullable', 'array'],
            'eligible_segment_ids' => ['nullable', 'array'],
            'metadata' => ['nullable', 'array'],
        ]);

        $data['store_id'] = $storeId;
        $data['code'] = strtoupper($data['code']);
        $data['minimum_amount'] = $data['minimum_amount'] ?? 0;
        $data['is_active'] = $data['is_active'] ?? true;
        $data['applies_to'] = $data['applies_to'] ?? 'all';
        $data['customer_eligibility'] = $data['customer_eligibility'] ?? 'all';

        $discount = Discount::create($data);

        return ApiResponse::success($discount, 'Discount created.', 201);
    }

    /**
     * GET /api/vendor/discounts/{discount}
     */
    public function show(Request $request, Discount $discount): JsonResponse
    {
        $this->authorizeStore($request, $discount);

        return ApiResponse::success($discount);
    }

    /**
     * PUT /api/vendor/discounts/{discount}
     */
    public function update(Request $request, Discount $discount): JsonResponse
    {
        $this->authorizeStore($request, $discount);
        $storeId = $discount->store_id;

        $data = $request->validate([
            'code' => [
                'sometimes', 'string', 'max:64',
                Rule::unique('discounts', 'code')
                    ->where(fn ($q) => $q->where('store_id', $storeId)->whereNull('deleted_at'))
                    ->ignore($discount->id),
            ],
            'name' => ['sometimes', 'string', 'max:255'],
            'type' => ['sometimes', 'in:percentage,fixed,free_shipping,bogo'],
            'value' => ['sometimes', 'numeric', 'min:0'],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['sometimes', 'date'],
            'minimum_amount' => ['nullable', 'numeric', 'min:0'],
            'maximum_discount' => ['nullable', 'numeric', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'usage_per_customer' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['sometimes', 'boolean'],
            'applies_to' => ['sometimes', 'in:all,products,collections,categories'],
            'eligible_product_ids' => ['nullable', 'array'],
            'eligible_collection_ids' => ['nullable', 'array'],
            'eligible_category_ids' => ['nullable', 'array'],
            'excluded_product_ids' => ['nullable', 'array'],
            'customer_eligibility' => ['sometimes', 'in:all,specific,segments'],
            'eligible_customer_ids' => ['nullable', 'array'],
            'eligible_segment_ids' => ['nullable', 'array'],
            'metadata' => ['nullable', 'array'],
        ]);

        if (isset($data['code'])) {
            $data['code'] = strtoupper($data['code']);
        }

        $discount->update($data);

        return ApiResponse::success($discount->fresh(), 'Discount updated.');
    }

    /**
     * DELETE /api/vendor/discounts/{discount}
     */
    public function destroy(Request $request, Discount $discount): JsonResponse
    {
        $this->authorizeStore($request, $discount);
        $discount->delete();

        return ApiResponse::success(null, 'Discount deleted.');
    }

    /**
     * POST /api/vendor/discounts/{discount}/toggle-active
     */
    public function toggleActive(Request $request, Discount $discount): JsonResponse
    {
        $this->authorizeStore($request, $discount);

        $discount->update(['is_active' => ! $discount->is_active]);

        return ApiResponse::success($discount->fresh(), 'Discount status toggled.');
    }

    /**
     * POST /api/vendor/discounts/{discount}/duplicate
     */
    public function duplicate(Request $request, Discount $discount): JsonResponse
    {
        $this->authorizeStore($request, $discount);

        $clone = $discount->replicate(['used_count']);
        $clone->used_count = 0;

        // Ensure unique code
        $baseCode = $discount->code.'-COPY';
        $code = $baseCode;
        $i = 1;
        while (Discount::where('store_id', $discount->store_id)->where('code', $code)->exists()) {
            $code = $baseCode.$i;
            $i++;
        }
        $clone->code = $code;
        $clone->name = $discount->name.' (Copy)';
        $clone->is_active = false;
        $clone->save();

        return ApiResponse::success($clone->fresh(), 'Discount duplicated.', 201);
    }

    /**
     * POST /api/vendor/discounts/validate
     * Validate a discount code for an order.
     *
     * Body: { code, order_amount, customer_id? }
     * Returns: { valid, discount_amount, reason_if_invalid? }
     */
    public function validate(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $data = $request->validate([
            'code' => ['required', 'string', 'max:64'],
            'order_amount' => ['required', 'numeric', 'min:0'],
            'customer_id' => ['nullable', 'integer'],
        ]);

        $code = strtoupper(trim($data['code']));
        $orderAmount = (float) $data['order_amount'];
        $customerId = $data['customer_id'] ?? null;

        $discount = Discount::where('store_id', $storeId)
            ->whereRaw('UPPER(code) = ?', [$code])
            ->first();

        if (! $discount) {
            return ApiResponse::success([
                'valid' => false,
                'discount_amount' => 0,
                'reason_if_invalid' => 'Invalid discount code.',
            ]);
        }

        if (! $discount->is_active) {
            return ApiResponse::success([
                'valid' => false,
                'discount_amount' => 0,
                'reason_if_invalid' => 'This discount is not active.',
            ]);
        }

        $now = Carbon::now();
        if ($discount->start_date && $now->lt($discount->start_date)) {
            return ApiResponse::success([
                'valid' => false,
                'discount_amount' => 0,
                'reason_if_invalid' => 'This discount is not yet active.',
            ]);
        }
        if ($discount->end_date && $now->gt($discount->end_date)) {
            return ApiResponse::success([
                'valid' => false,
                'discount_amount' => 0,
                'reason_if_invalid' => 'This discount has expired.',
            ]);
        }

        if ($discount->usage_limit !== null && $discount->used_count >= $discount->usage_limit) {
            return ApiResponse::success([
                'valid' => false,
                'discount_amount' => 0,
                'reason_if_invalid' => 'This discount has reached its usage limit.',
            ]);
        }

        if ($customerId && $discount->usage_per_customer !== null) {
            $perCustomerCount = DiscountUsage::where('discount_id', $discount->id)
                ->where('customer_id', $customerId)
                ->count();

            if ($perCustomerCount >= $discount->usage_per_customer) {
                return ApiResponse::success([
                    'valid' => false,
                    'discount_amount' => 0,
                    'reason_if_invalid' => 'You have already used this discount the maximum number of times.',
                ]);
            }
        }

        if ($discount->minimum_amount !== null && $orderAmount < (float) $discount->minimum_amount) {
            return ApiResponse::success([
                'valid' => false,
                'discount_amount' => 0,
                'reason_if_invalid' => 'Order amount does not meet the minimum of '.$discount->minimum_amount.'.',
            ]);
        }

        // Customer eligibility check (when customer_id is known)
        if ($customerId && $discount->customer_eligibility === 'specific') {
            $eligible = $discount->eligible_customer_ids ?? [];
            if (! in_array($customerId, $eligible, false)) {
                return ApiResponse::success([
                    'valid' => false,
                    'discount_amount' => 0,
                    'reason_if_invalid' => 'You are not eligible for this discount.',
                ]);
            }
        }

        // Compute amount
        $discountAmount = 0.0;
        switch ($discount->type) {
            case 'percentage':
                $discountAmount = round($orderAmount * ((float) $discount->value / 100), 2);
                break;
            case 'fixed':
                $discountAmount = round(min((float) $discount->value, $orderAmount), 2);
                break;
            case 'free_shipping':
                // Amount signaled to caller as 0; caller applies to shipping separately.
                $discountAmount = 0.0;
                break;
            case 'bogo':
                // Actual BOGO computation depends on cart items; return 0 here.
                $discountAmount = 0.0;
                break;
        }

        if ($discount->maximum_discount !== null && $discountAmount > (float) $discount->maximum_discount) {
            $discountAmount = (float) $discount->maximum_discount;
        }

        $discountAmount = max(0.0, min($discountAmount, $orderAmount));

        return ApiResponse::success([
            'valid' => true,
            'discount_amount' => $discountAmount,
            'discount' => $discount,
        ]);
    }

    protected function authorizeStore(Request $request, Discount $discount): void
    {
        if ($discount->store_id !== $this->currentStoreId($request)) {
            abort(response()->json([
                'success' => false,
                'message' => 'Not found.',
                'data' => null,
            ], 404));
        }
    }
}
