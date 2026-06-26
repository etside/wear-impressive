<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Events\StaffInvited;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Staff;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @group Vendor Dashboard
 */
class StaffController extends Controller
{
    /**
     * GET /api/vendor/staff
     * List staff members for the current store.
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $request->user()->store_id;

        $query = Staff::query()->where('store_id', $storeId);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($role = $request->query('role')) {
            $query->where('role', $role);
        }

        if ($request->query('pending') === 'true') {
            $query->whereNull('accepted_at');
        }

        $staff = $query->orderByDesc('created_at')->paginate((int) $request->query('per_page', 20));

        return ApiResponse::success($staff);
    }

    /**
     * GET /api/vendor/staff/{staff}
     */
    public function show(Request $request, Staff $staff): JsonResponse
    {
        $this->authorizeStore($request, $staff);

        return ApiResponse::success($staff);
    }

    /**
     * POST /api/vendor/staff
     * Invite a new staff member by email. Fires StaffInvited event which
     * triggers the invitation email.
     */
    public function invite(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', 'required_without:phone'],
            'phone' => ['nullable', 'string', 'max:30', 'required_without:email'],
            'role' => ['required', 'string', 'max:50'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string'],
            'branch_ids' => ['nullable', 'array'],
            'branch_ids.*' => ['integer'],
            'password' => ['nullable', 'string', 'min:6', 'max:255', 'required_without:email'],
            'send_credentials' => ['nullable', 'boolean'],
        ]);

        $vendor = $request->user();
        $storeId = $vendor->store_id;

        // Reject duplicates within the store, matching by email and/or phone.
        $existing = Staff::query()
            ->where('store_id', $storeId)
            ->where(function ($q) use ($data) {
                if (! empty($data['email'])) {
                    $q->orWhere('email', $data['email']);
                }
                if (! empty($data['phone'])) {
                    $q->orWhere('phone', $data['phone']);
                }
            })
            ->first();

        // Direct creation: vendor set a password, so the account is usable
        // immediately — no email invitation round-trip required.
        $hasPassword = ! empty($data['password']);

        if ($existing && $existing->accepted_at) {
            return ApiResponse::error('A staff member with this email or phone already exists for this store.', 422);
        }

        $attributes = [
            'store_id' => $storeId,
            'name' => $data['name'],
            'email' => $data['email'] ?? ($existing->email ?? null),
            'phone' => $data['phone'] ?? ($existing->phone ?? null),
            'role' => $data['role'],
            'permissions' => $data['permissions'] ?? null,
            'branch_ids' => $data['branch_ids'] ?? null,
            'invited_by' => $vendor->id,
        ];

        if ($hasPassword) {
            // Vendor-set credentials — member is active and can log in now.
            $attributes['password'] = Hash::make($data['password']);
            $attributes['active'] = true;
            $attributes['accepted_at'] = now();
            $attributes['invitation_token'] = null;
        } else {
            // Email-invite flow — placeholder password, member sets it on accept.
            $attributes['password'] = Hash::make(Str::random(40));
            $attributes['active'] = false;
            $attributes['invitation_token'] = Str::random(64);
        }

        if ($existing) {
            $existing->update($attributes);
            $staff = $existing->fresh();
        } else {
            $staff = Staff::create($attributes);
        }

        // Email the invitation only when there's no vendor-set password, or
        // when the vendor explicitly asked to send the credentials.
        $shouldEmail = ! empty($staff->email)
            && (! $hasPassword || ($data['send_credentials'] ?? false));
        if ($shouldEmail) {
            StaffInvited::dispatch($staff);
        }

        return ApiResponse::success($staff, $hasPassword ? 'Team member added.' : 'Invitation sent.', 201);
    }

    /**
     * POST /api/vendor/staff/{staff}/resend-invite
     */
    public function resendInvite(Request $request, Staff $staff): JsonResponse
    {
        $this->authorizeStore($request, $staff);

        if ($staff->accepted_at) {
            return ApiResponse::error('This staff member has already accepted their invitation.', 422);
        }

        $staff->update(['invitation_token' => Str::random(64)]);
        StaffInvited::dispatch($staff->fresh());

        return ApiResponse::success($staff->fresh(), 'Invitation re-sent.');
    }

    /**
     * PATCH /api/vendor/staff/{staff}
     * Update role, permissions, active flag, or name.
     */
    public function update(Request $request, Staff $staff): JsonResponse
    {
        $this->authorizeStore($request, $staff);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'role' => ['sometimes', 'string', 'max:50'],
            'permissions' => ['sometimes', 'nullable', 'array'],
            'permissions.*' => ['string'],
            'branch_ids' => ['sometimes', 'nullable', 'array'],
            'branch_ids.*' => ['integer'],
            'active' => ['sometimes', 'boolean'],
            'password' => ['sometimes', 'nullable', 'string', 'min:6', 'max:255'],
        ]);

        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $staff->update($data);

        return ApiResponse::success($staff->fresh(), 'Staff updated.');
    }

    /**
     * DELETE /api/vendor/staff/{staff}
     */
    public function destroy(Request $request, Staff $staff): JsonResponse
    {
        $this->authorizeStore($request, $staff);

        // Revoke any active tokens before deletion.
        $staff->tokens()->delete();
        $staff->delete();

        return ApiResponse::success(null, 'Staff member removed.');
    }

    protected function authorizeStore(Request $request, Staff $staff): void
    {
        if ($staff->store_id !== $request->user()->store_id) {
            abort(response()->json([
                'success' => false,
                'message' => 'Not found.',
                'data' => null,
            ], 404));
        }
    }
}
