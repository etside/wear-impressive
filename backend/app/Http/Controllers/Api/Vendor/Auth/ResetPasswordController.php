<?php

namespace App\Http\Controllers\Api\Vendor\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Vendor\Auth\ResetPasswordRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Vendor;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/**
 * @group Vendor Dashboard
 * @subgroup Auth
 */
class ResetPasswordController extends Controller
{
    /**
     * POST /api/vendor/reset-password
     */
    public function __invoke(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::broker('vendors')->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (Vendor $vendor, string $password) {
                $vendor->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($vendor));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return ApiResponse::success(['status' => $status], __($status) ?: 'Password reset successfully.');
        }

        return ApiResponse::error(__($status) ?: 'Unable to reset password.', 422);
    }
}
