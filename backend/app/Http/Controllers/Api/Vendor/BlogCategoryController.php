<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\BlogCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * @group Vendor Dashboard
 */
class BlogCategoryController extends Controller
{
    /**
     * GET /api/vendor/blog-categories
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $query = BlogCategory::query()
            ->where('store_id', $storeId)
            ->withCount('posts');

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $categories = $query->orderBy('sort_order')->orderBy('name')->get();

        return ApiResponse::success($categories);
    }

    /**
     * POST /api/vendor/blog-categories
     */
    public function store(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                'nullable', 'string', 'max:255',
                Rule::unique('blog_categories', 'slug')->where(fn ($q) => $q->where('store_id', $storeId)->whereNull('deleted_at')),
            ],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $data['slug'] = $data['slug'] ?? $this->generateUniqueSlug($storeId, $data['name']);
        $data['store_id'] = $storeId;
        $data['color'] = $data['color'] ?? '#3B82F6';

        $category = BlogCategory::create($data);

        return ApiResponse::success($category, 'Blog category created.', 201);
    }

    /**
     * GET /api/vendor/blog-categories/{category}
     */
    public function show(Request $request, BlogCategory $blogCategory): JsonResponse
    {
        $this->authorizeStore($request, $blogCategory);

        return ApiResponse::success($blogCategory->loadCount('posts'));
    }

    /**
     * PUT /api/vendor/blog-categories/{category}
     */
    public function update(Request $request, BlogCategory $blogCategory): JsonResponse
    {
        $this->authorizeStore($request, $blogCategory);
        $storeId = $blogCategory->store_id;

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => [
                'sometimes', 'string', 'max:255',
                Rule::unique('blog_categories', 'slug')
                    ->where(fn ($q) => $q->where('store_id', $storeId)->whereNull('deleted_at'))
                    ->ignore($blogCategory->id),
            ],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $blogCategory->update($data);

        return ApiResponse::success($blogCategory->fresh(), 'Blog category updated.');
    }

    /**
     * DELETE /api/vendor/blog-categories/{category}
     */
    public function destroy(Request $request, BlogCategory $blogCategory): JsonResponse
    {
        $this->authorizeStore($request, $blogCategory);
        $blogCategory->delete();

        return ApiResponse::success(null, 'Blog category deleted.');
    }

    protected function authorizeStore(Request $request, BlogCategory $category): void
    {
        if ($category->store_id !== $this->currentStoreId($request)) {
            abort(response()->json([
                'success' => false,
                'message' => 'Not found.',
                'data' => null,
            ], 404));
        }
    }

    protected function generateUniqueSlug(int $storeId, string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: Str::random(8);
        $slug = $base;
        $i = 1;

        while (
            BlogCategory::where('store_id', $storeId)
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
