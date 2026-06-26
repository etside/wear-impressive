<?php

namespace App\Http\Controllers\Api\Vendor\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Vendor\Auth\LoginRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Vendor;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

/**
 * @group Vendor Dashboard
 * @subgroup Auth
 */
class LoginController extends Controller
{
    /**
     * POST /api/vendor/login
     */
    public function __invoke(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();

        /** @var Vendor|null $vendor */
        $vendor = Vendor::query()->where('email', $data['email'])->first();

        if (! $vendor || ! Hash::check($data['password'], $vendor->password)) {
            return ApiResponse::error('Invalid email or password.', 401);
        }

        $vendor->forceFill(['last_login_at' => now()])->save();

        $token = $vendor->createToken('api')->plainTextToken;

        $vendor->load('store');

        return ApiResponse::success([
            'vendor' => $vendor,
            'store' => $vendor->store,
            'token' => $token,
            'token_type' => 'Bearer',
        ], 'Login successful.');
    }
}
