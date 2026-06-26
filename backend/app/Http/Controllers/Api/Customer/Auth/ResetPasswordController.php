<?php

namespace App\Http\Controllers\Api\Customer\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\Auth\ResetPasswordRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Customer;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/**
 * @group Customer Account
 * @subgroup Auth
 */
class ResetPasswordController extends Controller
{
    /**
     * POST /api/customer/reset-password
     */
    public function __invoke(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::broker('customers')->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (Customer $customer, string $password) {
                $customer->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($customer));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return ApiResponse::success(['status' => $status], __($status) ?: 'Password reset successfully.');
        }

        return ApiResponse::error(__($status) ?: 'Unable to reset password.', 422);
    }
}
