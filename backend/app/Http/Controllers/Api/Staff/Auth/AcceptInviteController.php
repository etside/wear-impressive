<?php

namespace App\Http\Controllers\Api\Staff\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\Auth\AcceptInviteRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Staff;
use Illuminate\Http\JsonResponse;

/**
 * @group Staff Portal
 * @subgroup Auth
 */
class AcceptInviteController extends Controller
{
    /**
     * POST /api/staff/accept-invite
     *
     * Finds a Staff record by invitation_token, sets password,
     * marks accepted_at and active=true, clears invitation_token,
     * and returns a Sanctum token.
     */
    public function __invoke(AcceptInviteRequest $request): JsonResponse
    {
        $data = $request->validated();

        /** @var Staff|null $staff */
        $staff = Staff::query()
            ->where('invitation_token', $data['invitation_token'])
            ->first();

        if (! $staff) {
            return ApiResponse::error('Invalid or expired invitation token.', 404);
        }

        if ($staff->accepted_at) {
            return ApiResponse::error('This invitation has already been accepted.', 409);
        }

        $staff->forceFill([
            'password' => $data['password'],
            'accepted_at' => now(),
            'active' => true,
            'invitation_token' => null,
            'last_login_at' => now(),
        ])->save();

        $token = $staff->createToken('api')->plainTextToken;

        $staff->load('store');

        return ApiResponse::success([
            'staff' => $staff,
            'store' => $staff->store,
            'token' => $token,
            'token_type' => 'Bearer',
        ], 'Invitation accepted.');
    }
}
