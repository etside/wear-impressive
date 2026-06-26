<?php

namespace App\Http\Controllers\Api\Staff\Auth;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Staff Portal
 * @subgroup Auth
 */
class MeController extends Controller
{
    /**
     * GET /api/staff/me
     */
    public function __invoke(Request $request): JsonResponse
    {
        $staff = $request->user('staff');

        if (! $staff) {
            return ApiResponse::error('Unauthenticated.', 401);
        }

        $staff->load('store');

        return ApiResponse::success([
            'staff' => $staff,
            'store' => $staff->store,
        ]);
    }
}
