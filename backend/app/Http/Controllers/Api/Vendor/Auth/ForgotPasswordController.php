<?php

namespace App\Http\Controllers\Api\Vendor\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Vendor\Auth\ForgotPasswordRequest;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;

/**
 * @group Vendor Dashboard
 * @subgroup Auth
 */
class ForgotPasswordController extends Controller
{
    /**
     * POST /api/vendor/forgot-password
     */
    public function __invoke(ForgotPasswordRequest $request): JsonResponse
    {
        $status = Password::broker('vendors')->sendResetLink(
            $request->only('email')
        );

        if ($status === Password::RESET_LINK_SENT) {
            return ApiResponse::success(
                ['status' => $status],
                __($status) ?: 'Password reset link sent.'
            );
        }

        return ApiResponse::error(__($status) ?: 'Unable to send password reset link.', 422);
    }
}
