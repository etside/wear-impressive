<?php

namespace App\Http\Controllers\Api\Vendor\Auth;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * @group Vendor Dashboard
 * @subgroup Auth
 */
class LogoutController extends Controller
{
    /**
     * POST /api/vendor/logout
     *
     * Requires auth:vendor. Revokes the current access token.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $vendor = $request->user('vendor');

        if (! $vendor) {
            return ApiResponse::error('Unauthenticated.', 401);
        }

        $currentToken = $vendor->currentAccessToken();

        if ($currentToken instanceof PersonalAccessToken) {
            $currentToken->delete();
        }

        return ApiResponse::success(null, 'Logged out.');
    }
}
