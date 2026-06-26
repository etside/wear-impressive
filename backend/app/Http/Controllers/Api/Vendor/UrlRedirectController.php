<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\UrlRedirect;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * @group Vendor Dashboard
 */
class UrlRedirectController extends Controller
{
    /**
     * GET /api/vendor/url-redirects
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $query = UrlRedirect::where('store_id', $storeId);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('from_path', 'like', "%{$search}%")
                    ->orWhere('to_path', 'like', "%{$search}%");
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $perPage = (int) $request->query('per_page', 50);
        $redirects = $query->orderByDesc('created_at')->paginate($perPage);

        return ApiResponse::success($redirects);
    }

    /**
     * POST /api/vendor/url-redirects
     */
    public function store(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $data = $request->validate([
            'from_path' => [
                'required', 'string', 'max:500',
                Rule::unique('url_redirects', 'from_path')
                    ->where(fn ($q) => $q->where('store_id', $storeId)),
            ],
            'to_path' => ['required', 'string', 'max:500'],
            'redirect_type' => ['nullable', 'in:301,302'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $data['store_id'] = $storeId;
        $data['redirect_type'] = $data['redirect_type'] ?? '301';
        $data['is_active'] = $data['is_active'] ?? true;

        $redirect = UrlRedirect::create($data);

        return ApiResponse::success($redirect, 'Redirect created.', 201);
    }

    /**
     * GET /api/vendor/url-redirects/{redirect}
     */
    public function show(Request $request, UrlRedirect $urlRedirect): JsonResponse
    {
        $this->authorizeStore($request, $urlRedirect);

        return ApiResponse::success($urlRedirect);
    }

    /**
     * PUT /api/vendor/url-redirects/{redirect}
     */
    public function update(Request $request, UrlRedirect $urlRedirect): JsonResponse
    {
        $this->authorizeStore($request, $urlRedirect);
        $storeId = $urlRedirect->store_id;

        $data = $request->validate([
            'from_path' => [
                'sometimes', 'string', 'max:500',
                Rule::unique('url_redirects', 'from_path')
                    ->where(fn ($q) => $q->where('store_id', $storeId))
                    ->ignore($urlRedirect->id),
            ],
            'to_path' => ['sometimes', 'string', 'max:500'],
            'redirect_type' => ['sometimes', 'in:301,302'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $urlRedirect->update($data);

        return ApiResponse::success($urlRedirect->fresh(), 'Redirect updated.');
    }

    /**
     * DELETE /api/vendor/url-redirects/{redirect}
     */
    public function destroy(Request $request, UrlRedirect $urlRedirect): JsonResponse
    {
        $this->authorizeStore($request, $urlRedirect);
        $urlRedirect->delete();

        return ApiResponse::success(null, 'Redirect deleted.');
    }

    /**
     * POST /api/vendor/url-redirects/import
     * Bulk create from array of { from_path, to_path, redirect_type? }
     */
    public function import(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $payload = $request->validate([
            'redirects' => ['required', 'array', 'min:1'],
            'redirects.*.from_path' => ['required', 'string', 'max:500'],
            'redirects.*.to_path' => ['required', 'string', 'max:500'],
            'redirects.*.redirect_type' => ['nullable', 'in:301,302'],
            'redirects.*.is_active' => ['nullable', 'boolean'],
        ]);

        $created = 0;
        $skipped = 0;
        $now = now();

        DB::transaction(function () use ($payload, $storeId, &$created, &$skipped, $now) {
            foreach ($payload['redirects'] as $row) {
                $exists = UrlRedirect::where('store_id', $storeId)
                    ->where('from_path', $row['from_path'])
                    ->exists();

                if ($exists) {
                    $skipped++;

                    continue;
                }

                UrlRedirect::create([
                    'store_id' => $storeId,
                    'from_path' => $row['from_path'],
                    'to_path' => $row['to_path'],
                    'redirect_type' => $row['redirect_type'] ?? '301',
                    'is_active' => $row['is_active'] ?? true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $created++;
            }
        });

        return ApiResponse::success([
            'created' => $created,
            'skipped' => $skipped,
        ], 'Redirects imported.');
    }

    protected function authorizeStore(Request $request, UrlRedirect $redirect): void
    {
        if ($redirect->store_id !== $this->currentStoreId($request)) {
            abort(response()->json([
                'success' => false,
                'message' => 'Not found.',
                'data' => null,
            ], 404));
        }
    }
}
