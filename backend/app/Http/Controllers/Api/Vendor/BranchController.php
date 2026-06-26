<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * @group Vendor Dashboard
 */
class BranchController extends Controller
{
    /**
     * GET /api/vendor/branches
     */
    public function index(Request $request): JsonResponse
    {
        $store = $request->store;

        $query = Branch::query()->where('store_id', $store->id);

        if ($request->filled('type')) {
            $query->where('type', $request->string('type'));
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('q')) {
            $q = $request->string('q');
            $query->where(function ($w) use ($q) {
                $w->where('name', 'like', "%{$q}%")
                    ->orWhere('district', 'like', "%{$q}%")
                    ->orWhere('thana', 'like', "%{$q}%");
            });
        }

        $branches = $query->orderByDesc('is_main')->orderBy('name')->paginate(
            (int) $request->integer('per_page', 20)
        );

        return ApiResponse::success($branches);
    }

    /**
     * POST /api/vendor/branches
     */
    public function store(Request $request): JsonResponse
    {
        $store = $request->store;

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:store,warehouse,fulfillment'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address_line_1' => ['nullable', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'division' => ['nullable', 'string', 'max:100'],
            'district' => ['nullable', 'string', 'max:100'],
            'thana' => ['nullable', 'string', 'max:100'],
            'area' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'open_time' => ['nullable', 'date_format:H:i'],
            'close_time' => ['nullable', 'date_format:H:i'],
            'work_days' => ['nullable', 'array'],
            'work_days.*' => ['string'],
            'is_main' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $data['store_id'] = $store->id;
        $isMain = (bool) ($data['is_main'] ?? false);

        $branch = DB::transaction(function () use ($data, $isMain, $store) {
            if ($isMain) {
                Branch::where('store_id', $store->id)->update(['is_main' => false]);
            }

            return Branch::create($data);
        });

        return ApiResponse::success($branch, 'Branch created.', 201);
    }

    /**
     * GET /api/vendor/branches/{branch}
     */
    public function show(Request $request, Branch $branch): JsonResponse
    {
        $this->authorizeStoreScope($request, $branch);

        return ApiResponse::success($branch);
    }

    /**
     * PUT /api/vendor/branches/{branch}
     */
    public function update(Request $request, Branch $branch): JsonResponse
    {
        $this->authorizeStoreScope($request, $branch);

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['sometimes', 'required', 'in:store,warehouse,fulfillment'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address_line_1' => ['nullable', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'division' => ['nullable', 'string', 'max:100'],
            'district' => ['nullable', 'string', 'max:100'],
            'thana' => ['nullable', 'string', 'max:100'],
            'area' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'open_time' => ['nullable', 'date_format:H:i'],
            'close_time' => ['nullable', 'date_format:H:i'],
            'work_days' => ['nullable', 'array'],
            'work_days.*' => ['string'],
            'is_main' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $store = $request->store;

        DB::transaction(function () use ($data, $branch, $store) {
            if (! empty($data['is_main'])) {
                Branch::where('store_id', $store->id)
                    ->where('id', '!=', $branch->id)
                    ->update(['is_main' => false]);
            }

            $branch->update($data);
        });

        return ApiResponse::success($branch->fresh(), 'Branch updated.');
    }

    /**
     * DELETE /api/vendor/branches/{branch}
     */
    public function destroy(Request $request, Branch $branch): JsonResponse
    {
        $this->authorizeStoreScope($request, $branch);

        if ($branch->is_main) {
            return ApiResponse::error('Cannot delete the main branch.', 422);
        }

        $branch->delete();

        return ApiResponse::success(null, 'Branch deleted.');
    }

    /**
     * POST /api/vendor/branches/{branch}/set-main
     */
    public function setMain(Request $request, Branch $branch): JsonResponse
    {
        $this->authorizeStoreScope($request, $branch);

        $store = $request->store;

        DB::transaction(function () use ($branch, $store) {
            Branch::where('store_id', $store->id)->update(['is_main' => false]);
            $branch->update(['is_main' => true]);
        });

        return ApiResponse::success($branch->fresh(), 'Main branch updated.');
    }

    private function authorizeStoreScope(Request $request, Branch $branch): void
    {
        abort_if($branch->store_id !== $request->store->id, 404, 'Branch not found.');
    }
}
