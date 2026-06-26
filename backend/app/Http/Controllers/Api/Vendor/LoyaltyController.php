<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Customer;
use App\Models\LoyaltyAccount;
use App\Models\LoyaltyConfig;
use App\Models\LoyaltyTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * @group Vendor Loyalty
 */
class LoyaltyController extends Controller
{
    /**
     * GET /api/vendor/loyalty/config
     */
    public function showConfig(Request $request): JsonResponse
    {
        $config = $this->resolveConfig($request->user()->store_id);

        return ApiResponse::success($config);
    }

    /**
     * PATCH /api/vendor/loyalty/config
     */
    public function updateConfig(Request $request): JsonResponse
    {
        $storeId = $request->user()->store_id;

        $data = $request->validate([
            'is_active' => ['nullable', 'boolean'],
            'spend_amount_for_points' => ['nullable', 'numeric', 'min:1'],
            'points_per_spend' => ['nullable', 'integer', 'min:1'],
            'redemption_value' => ['nullable', 'numeric', 'min:0.01'],
            'min_redemption_points' => ['nullable', 'integer', 'min:1'],
            'points_expiry_days' => ['nullable', 'integer', 'min:1'],
            'welcome_bonus_points' => ['nullable', 'integer', 'min:0'],
        ]);

        $config = $this->resolveConfig($storeId);
        $config->fill($data);
        $config->save();

        return ApiResponse::success($config->fresh());
    }

    /**
     * GET /api/vendor/loyalty/accounts
     *
     * Filters: search (customer name / email / phone), per_page, page.
     */
    public function indexAccounts(Request $request): JsonResponse
    {
        $storeId = $request->user()->store_id;

        $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $query = LoyaltyAccount::query()
            ->where('store_id', $storeId)
            ->with('customer:id,name,email,phone');

        if ($search = $request->input('search')) {
            $query->whereHas('customer', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $accounts = $query->orderByDesc('balance')
            ->paginate($request->integer('per_page', 25));

        return ApiResponse::success($accounts);
    }

    /**
     * GET /api/vendor/loyalty/accounts/{customer_id}
     */
    public function showAccount(Request $request, int $customerId): JsonResponse
    {
        $storeId = $request->user()->store_id;

        // Ensure the customer belongs to this store.
        Customer::query()
            ->where('store_id', $storeId)
            ->where('id', $customerId)
            ->firstOrFail();

        $account = $this->resolveAccount($storeId, $customerId);

        $transactions = LoyaltyTransaction::query()
            ->where('loyalty_account_id', $account->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return ApiResponse::success([
            'account' => $account->load('customer:id,name,email,phone'),
            'transactions' => $transactions,
        ]);
    }

    /**
     * POST /api/vendor/loyalty/accounts/{customer_id}/adjust
     *
     * Body: { type: earn|redeem|adjust, points: int, reason: string }
     */
    public function adjust(Request $request, int $customerId): JsonResponse
    {
        $storeId = $request->user()->store_id;

        $customer = Customer::query()
            ->where('store_id', $storeId)
            ->where('id', $customerId)
            ->firstOrFail();

        $data = $request->validate([
            'type' => ['required', 'string', 'in:earn,redeem,adjust'],
            'points' => ['required', 'integer', 'not_in:0'],
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $account = $this->resolveAccount($storeId, $customerId);

        // Normalise the signed delta applied to balance + totals.
        $points = (int) $data['points'];
        $type = $data['type'];
        $delta = match ($type) {
            'earn' => abs($points),
            'redeem' => -abs($points),
            // 'adjust' keeps the caller-supplied sign (can be +/-).
            default => $points,
        };

        if ($account->balance + $delta < 0) {
            return ApiResponse::error('Insufficient loyalty balance for this operation.', 422);
        }

        $transaction = DB::transaction(function () use ($account, $data, $delta, $type) {
            $account->balance += $delta;

            if ($delta > 0) {
                $account->total_earned += $delta;
            } elseif ($delta < 0) {
                $account->total_redeemed += abs($delta);
            }

            $account->save();

            $causer = Auth::guard('vendor')->user() ?? Auth::guard('staff')->user();

            return LoyaltyTransaction::create([
                'loyalty_account_id' => $account->id,
                'type' => $type,
                'points' => $delta,
                'reason' => $data['reason'],
                'reference_type' => null,
                'reference_id' => null,
                'created_by_type' => $causer?->getMorphClass(),
                'created_by_id' => $causer?->getKey(),
            ]);
        });

        activity('loyalty')
            ->performedOn($account)
            ->withProperties([
                'customer_id' => $customer->id,
                'type' => $data['type'],
                'points' => (int) $data['points'],
                'reason' => $data['reason'],
                'balance_after' => $account->fresh()->balance,
            ])
            ->event('adjust')
            ->log("Loyalty {$data['type']} for customer #{$customer->id}");

        return ApiResponse::success([
            'account' => $account->fresh()->load('customer:id,name,email,phone'),
            'transaction' => $transaction,
        ]);
    }

    /**
     * Load or create the per-store loyalty config with schema defaults.
     */
    protected function resolveConfig(int $storeId): LoyaltyConfig
    {
        return LoyaltyConfig::firstOrCreate(
            ['store_id' => $storeId],
            [
                'is_active' => false,
                'spend_amount_for_points' => 100,
                'points_per_spend' => 1,
                'redemption_value' => 1,
                'min_redemption_points' => 50,
                'points_expiry_days' => null,
                'welcome_bonus_points' => 0,
            ]
        );
    }

    /**
     * Load or create the loyalty account for a (store, customer) pair.
     */
    protected function resolveAccount(int $storeId, int $customerId): LoyaltyAccount
    {
        return LoyaltyAccount::firstOrCreate(
            ['store_id' => $storeId, 'customer_id' => $customerId],
            ['balance' => 0, 'total_earned' => 0, 'total_redeemed' => 0]
        );
    }
}
