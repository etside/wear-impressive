<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\LoyaltyAccount;
use App\Models\LoyaltyConfig;
use App\Models\LoyaltyTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Customer Account
 */
class LoyaltyController extends Controller
{
    /**
     * GET /api/customer/loyalty
     *
     * Returns the current customer's loyalty config (so the storefront can
     * tell the customer "you earn N points per ৳M spent"), their account
     * balance, and recent transactions.
     */
    public function show(Request $request): JsonResponse
    {
        $customer = $request->user('customer');
        abort_if(! $customer, 401, 'Unauthenticated.');

        $storeId = $customer->store_id;

        $config = LoyaltyConfig::firstOrCreate(
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

        $account = LoyaltyAccount::firstOrCreate(
            ['store_id' => $storeId, 'customer_id' => $customer->id],
            ['balance' => 0, 'total_earned' => 0, 'total_redeemed' => 0]
        );

        $transactions = LoyaltyTransaction::query()
            ->where('loyalty_account_id', $account->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return ApiResponse::success([
            'config' => $config,
            'account' => $account,
            'transactions' => $transactions,
        ]);
    }
}
