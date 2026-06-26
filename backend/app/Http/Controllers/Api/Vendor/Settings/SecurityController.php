<?php

namespace App\Http\Controllers\Api\Vendor\Settings;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * @group Vendor Dashboard
 * @subgroup Settings
 *
 * Password management + active Sanctum session listing / revocation for
 * the authenticated vendor.
 */
class SecurityController extends Controller
{
    /**
     * GET /api/vendor/settings/security/password
     *
     * Returns the password change metadata plus a rough strength indicator
     * based on the age of the last rotation.
     */
    public function showPassword(Request $request): JsonResponse
    {
        $vendor = $request->user();

        return ApiResponse::success([
            'last_changed_at' => $vendor->password_changed_at,
            'password_strength' => $this->assessStrength($vendor->password_changed_at),
        ]);
    }

    /**
     * POST /api/vendor/settings/security/password
     *
     * Validates the supplied current password, stores the new hash, bumps
     * password_changed_at, and revokes every *other* Sanctum token so any
     * parallel sessions are forcibly logged out.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $vendor = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/[A-Za-z]/',
                'regex:/\d/',
            ],
        ]);

        if (! Hash::check($data['current_password'], $vendor->password)) {
            return ApiResponse::error('Current password is incorrect.', 422);
        }

        $vendor->forceFill([
            'password' => $data['new_password'],
            'password_changed_at' => now(),
        ])->save();

        // Revoke all tokens except the current one.
        $currentTokenId = $vendor->currentAccessToken()?->id;

        $vendor->tokens()
            ->when($currentTokenId, fn ($q) => $q->where('id', '!=', $currentTokenId))
            ->delete();

        activity('vendor.security')
            ->performedOn($vendor)
            ->causedBy($vendor)
            ->event('password_changed')
            ->withProperties(['ip' => $request->ip()])
            ->log('Vendor password changed.');

        return ApiResponse::success([
            'last_changed_at' => $vendor->password_changed_at,
            'password_strength' => $this->assessStrength($vendor->password_changed_at),
        ], 'Password updated successfully.');
    }

    /**
     * GET /api/vendor/settings/security/sessions
     *
     * Lists active personal access tokens scoped to this vendor. We only
     * surface session-style tokens (name 'api') and hide any rows that were
     * issued for programmatic API access (name starts with 'api:' prefix).
     */
    public function listSessions(Request $request): JsonResponse
    {
        $vendor = $request->user();
        $currentId = $vendor->currentAccessToken()?->id;

        $sessions = $vendor->tokens()
            ->where(function ($q) {
                $q->whereNull('name')
                    ->orWhere('name', 'not like', 'api:%');
            })
            ->orderByDesc('created_at')
            ->get()
            ->map(function (PersonalAccessToken $token) use ($currentId) {
                return [
                    'id' => $token->id,
                    'name' => $token->name,
                    'abilities' => $token->abilities,
                    'last_used_at' => $token->last_used_at,
                    'created_at' => $token->created_at,
                    'is_current' => $token->id === $currentId,
                ];
            });

        return ApiResponse::success($sessions);
    }

    /**
     * DELETE /api/vendor/settings/security/sessions/{token}
     *
     * Revoke a single session. Refuses to revoke the caller's own current
     * token — they should use POST /api/vendor/logout for that.
     */
    public function revokeSession(Request $request, int $token): JsonResponse
    {
        $vendor = $request->user();
        $currentId = $vendor->currentAccessToken()?->id;

        if ($currentId === $token) {
            return ApiResponse::error('Cannot revoke the current session. Use logout instead.', 422);
        }

        $deleted = $vendor->tokens()->where('id', $token)->delete();

        if ($deleted === 0) {
            return ApiResponse::error('Session not found.', 404);
        }

        return ApiResponse::success(null, 'Session revoked.');
    }

    /**
     * POST /api/vendor/settings/security/sessions/revoke-others
     *
     * Revoke every token belonging to the vendor except the current one.
     */
    public function revokeOtherSessions(Request $request): JsonResponse
    {
        $vendor = $request->user();
        $currentId = $vendor->currentAccessToken()?->id;

        $deleted = $vendor->tokens()
            ->when($currentId, fn ($q) => $q->where('id', '!=', $currentId))
            ->delete();

        return ApiResponse::success(['revoked' => $deleted], 'Other sessions revoked.');
    }

    /**
     * Classify the stored password as weak/ok/strong based on how recently
     * it was rotated. Designed to nudge users towards a fresh password.
     */
    protected function assessStrength(mixed $changedAt): string
    {
        if (! $changedAt) {
            return 'weak';
        }

        $changed = $changedAt instanceof \DateTimeInterface
            ? \Carbon\Carbon::instance($changedAt)
            : \Carbon\Carbon::parse((string) $changedAt);

        $days = $changed->diffInDays(now());

        if ($days > 180) {
            return 'weak';
        }

        if ($days > 90) {
            return 'ok';
        }

        return 'strong';
    }
}
