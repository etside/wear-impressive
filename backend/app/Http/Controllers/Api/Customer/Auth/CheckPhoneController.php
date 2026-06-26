<?php

namespace App\Http\Controllers\Api\Customer\Auth;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Customer Account
 * @subgroup Auth
 *
 * Public lookup used by the checkout's "create an account" toggle. Lets
 * the storefront tell the customer immediately if their phone already has
 * an account on this store, without revealing other identifying info.
 */
class CheckPhoneController extends Controller
{
    /**
     * POST /api/customer/check-phone
     *
     * Body: { phone: string }
     * Response: { exists: boolean }
     *
     * The lookup is scoped to the resolved store. We deliberately don't
     * leak whether an email exists — phone-only check matches the
     * mobile-first signup flow.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $data = $request->validate([
            'phone' => ['required', 'string', 'max:32'],
        ]);

        $phone = preg_replace('/\D/', '', (string) $data['phone']);

        // Reject anything that doesn't look like a Bangladeshi number rather
        // than running the DB query — saves the DB and prevents the endpoint
        // from being abused as a phone-format guesser.
        if (! preg_match('/^01[3-9]\d{8}$/', $phone)) {
            return ApiResponse::success(['exists' => false], 'Invalid phone format.');
        }

        $exists = Customer::query()
            ->where('store_id', $store->id)
            ->where('phone', $phone)
            ->whereNull('deleted_at')
            ->exists();

        return ApiResponse::success(['exists' => $exists], 'Phone lookup complete.');
    }
}
