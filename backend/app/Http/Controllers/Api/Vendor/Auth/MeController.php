<?php

namespace App\Http\Controllers\Api\Vendor\Auth;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Vendor Dashboard
 * @subgroup Auth
 */
class MeController extends Controller
{
    /**
     * GET /api/vendor/me
     *
     * Returns the authenticated vendor with their store.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $vendor = $request->user('vendor');

        if (! $vendor) {
            return ApiResponse::error('Unauthenticated.', 401);
        }

        $vendor->load('store');

        return ApiResponse::success([
            'vendor' => $vendor,
            'store' => $vendor->store,
        ]);
    }
}
