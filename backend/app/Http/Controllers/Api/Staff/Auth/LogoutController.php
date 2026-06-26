<?php

namespace App\Http\Controllers\Api\Staff\Auth;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * @group Staff Portal
 * @subgroup Auth
 */
class LogoutController extends Controller
{
    /**
     * POST /api/staff/logout
     */
    public function __invoke(Request $request): JsonResponse
    {
        $staff = $request->user('staff');

        if (! $staff) {
            return ApiResponse::error('Unauthenticated.', 401);
        }

        $currentToken = $staff->currentAccessToken();

        if ($currentToken instanceof PersonalAccessToken) {
            $currentToken->delete();
        }

        return ApiResponse::success(null, 'Logged out.');
    }
}
