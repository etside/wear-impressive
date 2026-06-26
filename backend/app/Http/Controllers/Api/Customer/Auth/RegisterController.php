<?php

namespace App\Http\Controllers\Api\Customer\Auth;

use App\Events\CustomerRegistered;
use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\Auth\RegisterRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;

/**
 * @group Customer Account
 * @subgroup Auth
 */
class RegisterController extends Controller
{
    /**
     * POST /api/customer/register
     *
     * Requires a resolved store (via ResolveStoreMiddleware).
     */
    public function __invoke(RegisterRequest $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $data = $request->validated();

        $customer = Customer::create([
            'store_id' => $store->id,
            'name' => $data['name'],
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'password' => $data['password'],
        ]);

        $token = $customer->createToken('api')->plainTextToken;

        event(new CustomerRegistered($customer));

        return ApiResponse::success([
            'customer' => $customer,
            'token' => $token,
            'token_type' => 'Bearer',
        ], 'Registration successful.', 201);
    }
}
