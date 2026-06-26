<?php

namespace App\Http\Controllers\Api\Customer\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\Auth\LoginRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

/**
 * @group Customer Account
 * @subgroup Auth
 */
class LoginController extends Controller
{
    /**
     * POST /api/customer/login
     *
     * Requires resolved store context. Scopes lookup by store_id.
     */
    public function __invoke(LoginRequest $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $data = $request->validated();

        /** @var Customer|null $customer */
        $customer = Customer::query()
            ->where('store_id', $store->id)
            ->when(! empty($data['email']), fn ($q) => $q->where('email', $data['email']))
            ->when(empty($data['email']) && ! empty($data['phone']), fn ($q) => $q->where('phone', $data['phone']))
            ->first();

        if (! $customer || ! $customer->password || ! Hash::check($data['password'], $customer->password)) {
            return ApiResponse::error('Invalid credentials.', 401);
        }

        $token = $customer->createToken('api')->plainTextToken;

        return ApiResponse::success([
            'customer' => $customer,
            'token' => $token,
            'token_type' => 'Bearer',
        ], 'Login successful.');
    }
}
