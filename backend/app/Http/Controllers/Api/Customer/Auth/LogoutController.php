<?php

namespace App\Http\Controllers\Api\Customer\Auth;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * @group Customer Account
 * @subgroup Auth
 */
class LogoutController extends Controller
{
    /**
     * POST /api/customer/logout
     */
    public function __invoke(Request $request): JsonResponse
    {
        $customer = $request->user('customer');

        if (! $customer) {
            return ApiResponse::error('Unauthenticated.', 401);
        }

        $currentToken = $customer->currentAccessToken();

        if ($currentToken instanceof PersonalAccessToken) {
            $currentToken->delete();
        }

        return ApiResponse::success(null, 'Logged out.');
    }
}
