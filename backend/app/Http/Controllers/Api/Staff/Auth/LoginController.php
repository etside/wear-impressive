<?php

namespace App\Http\Controllers\Api\Staff\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\Auth\LoginRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Staff;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

/**
 * @group Staff Portal
 * @subgroup Auth
 */
class LoginController extends Controller
{
    /**
     * POST /api/staff/login
     *
     * Requires accepted_at set and active=true.
     */
    public function __invoke(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();

        /** @var Staff|null $staff */
        $staff = Staff::query()
            ->when(! empty($data['email']), fn ($q) => $q->where('email', $data['email']))
            ->when(empty($data['email']) && ! empty($data['phone']), fn ($q) => $q->where('phone', $data['phone']))
            ->first();

        if (! $staff || ! Hash::check($data['password'], $staff->password)) {
            return ApiResponse::error('Invalid credentials.', 401);
        }

        if (! $staff->accepted_at) {
            return ApiResponse::error('You must accept your invitation first.', 403);
        }

        if (! $staff->active) {
            return ApiResponse::error('This account has been deactivated.', 403);
        }

        $staff->forceFill(['last_login_at' => now()])->save();

        $token = $staff->createToken('api')->plainTextToken;

        $staff->load('store');

        return ApiResponse::success([
            'staff' => $staff,
            'store' => $staff->store,
            'token' => $token,
            'token_type' => 'Bearer',
        ], 'Login successful.');
    }
}
