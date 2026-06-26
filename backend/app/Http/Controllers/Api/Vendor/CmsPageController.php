<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\CmsPage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * @group Vendor Dashboard
 */
class CmsPageController extends Controller
{
    /**
     * GET /api/vendor/cms-pages
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $query = CmsPage::query()->where('store_id', $storeId);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->query('per_page', 20);
        $pages = $query->orderByDesc('updated_at')->paginate($perPage);

        return ApiResponse::success($pages);
    }

    /**
     * POST /api/vendor/cms-pages
     */
    public function store(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'content' => ['nullable', 'string'],
            'sections' => ['nullable', 'array'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string'],
            'url_handle' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:draft,published'],
            'published_at' => ['nullable', 'date'],
            'template' => ['nullable', 'string', 'max:255'],
        ]);

        $data['store_id'] = $storeId;
        $data['slug'] = ! empty($data['slug'])
            ? $this->generateUniqueSlug($storeId, $data['slug'])
            : $this->generateUniqueSlug($storeId, $data['title']);
        $data['status'] = $data['status'] ?? 'draft';

        $user = $this->currentUser();
        $data['created_by_type'] = $this->currentUserType();
        $data['created_by_id'] = $user?->id;

        if ($data['status'] === 'published' && empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        $page = CmsPage::create($data);

        return ApiResponse::success($page, 'CMS page created.', 201);
    }

    /**
     * GET /api/vendor/cms-pages/{page}
     */
    public function show(Request $request, CmsPage $cmsPage): JsonResponse
    {
        $this->authorizeStore($request, $cmsPage);

        return ApiResponse::success($cmsPage);
    }

    /**
     * PUT /api/vendor/cms-pages/{page}
     */
    public function update(Request $request, CmsPage $cmsPage): JsonResponse
    {
        $this->authorizeStore($request, $cmsPage);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255'],
            'content' => ['nullable', 'string'],
            'sections' => ['nullable', 'array'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string'],
            'url_handle' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'in:draft,published'],
            'published_at' => ['nullable', 'date'],
            'template' => ['nullable', 'string', 'max:255'],
        ]);

        if (array_key_exists('slug', $data) && $data['slug'] !== $cmsPage->slug) {
            $data['slug'] = $this->generateUniqueSlug($cmsPage->store_id, $data['slug'], $cmsPage->id);
        } elseif (array_key_exists('title', $data) && ! array_key_exists('slug', $data) && $data['title'] !== $cmsPage->title) {
            $data['slug'] = $this->generateUniqueSlug($cmsPage->store_id, $data['title'], $cmsPage->id);
        }

        $cmsPage->update($data);

        return ApiResponse::success($cmsPage->fresh(), 'CMS page updated.');
    }

    /**
     * DELETE /api/vendor/cms-pages/{page}
     */
    public function destroy(Request $request, CmsPage $cmsPage): JsonResponse
    {
        $this->authorizeStore($request, $cmsPage);
        $cmsPage->delete();

        return ApiResponse::success(null, 'CMS page deleted.');
    }

    /**
     * POST /api/vendor/cms-pages/{page}/publish
     */
    public function publish(Request $request, CmsPage $cmsPage): JsonResponse
    {
        $this->authorizeStore($request, $cmsPage);

        $cmsPage->update([
            'status' => 'published',
            'published_at' => $cmsPage->published_at ?: now(),
        ]);

        return ApiResponse::success($cmsPage->fresh(), 'Page published.');
    }

    /**
     * POST /api/vendor/cms-pages/{page}/unpublish
     */
    public function unpublish(Request $request, CmsPage $cmsPage): JsonResponse
    {
        $this->authorizeStore($request, $cmsPage);

        $cmsPage->update(['status' => 'draft']);

        return ApiResponse::success($cmsPage->fresh(), 'Page unpublished.');
    }

    protected function authorizeStore(Request $request, CmsPage $page): void
    {
        if ($page->store_id !== $this->currentStoreId($request)) {
            abort(response()->json([
                'success' => false,
                'message' => 'Not found.',
                'data' => null,
            ], 404));
        }
    }

    protected function generateUniqueSlug(int $storeId, string $input, ?int $ignoreId = null): string
    {
        $base = Str::slug($input) ?: Str::random(8);
        $slug = $base;
        $i = 1;

        while (
            CmsPage::where('store_id', $storeId)
                ->where('slug', $slug)
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = $base.'-'.$i;
            $i++;
        }

        return $slug;
    }
}
