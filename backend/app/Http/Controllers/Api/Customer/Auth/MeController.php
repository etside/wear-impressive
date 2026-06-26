<?php

namespace App\Http\Controllers\Api\Customer\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\Auth\UpdateMeRequest;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/**
 * @group Customer Account
 * @subgroup Auth
 */
class MeController extends Controller
{
    /**
     * GET /api/customer/me
     */
    public function show(Request $request): JsonResponse
    {
        $customer = $request->user('customer');

        if (! $customer) {
            return ApiResponse::error('Unauthenticated.', 401);
        }

        $customer->load('store', 'addresses');

        return ApiResponse::success([
            'customer' => $customer,
            'store' => $customer->store,
        ]);
    }

    /**
     * PATCH /api/customer/me — update profile fields. Password change requires
     * `current_password` to match the customer's current hash.
     */
    public function update(UpdateMeRequest $request): JsonResponse
    {
        $customer = $request->user('customer');
        abort_if(! $customer, 401, 'Unauthenticated.');

        $data = $request->validated();

        if (array_key_exists('password', $data)) {
            if (! Hash::check((string) ($data['current_password'] ?? ''), (string) $customer->password)) {
                return ApiResponse::error('Current password is incorrect.', 422, [
                    'current_password' => ['Current password is incorrect.'],
                ]);
            }
            $customer->password = Hash::make($data['password']);
        }

        unset($data['current_password'], $data['password'], $data['password_confirmation']);

        $customer->fill($data);
        $customer->save();
        $customer->load('store', 'addresses');

        return ApiResponse::success([
            'customer' => $customer,
            'store' => $customer->store,
        ], 'Profile updated.');
    }

    /**
     * Backwards-compat: keep the invokable form so the existing
     * `Route::get('me', CustomerMeController::class)` keeps working until the
     * route file is updated.
     */
    public function __invoke(Request $request): JsonResponse
    {
        return $this->show($request);
    }
}
