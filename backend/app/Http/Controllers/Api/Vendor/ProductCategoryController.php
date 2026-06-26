<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Vendor\Categories\StoreCategoryRequest;
use App\Http\Requests\Vendor\Categories\UpdateCategoryRequest;
use App\Http\Responses\ApiResponse;
use App\Models\ProductCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * @group Vendor Dashboard
 */
class ProductCategoryController extends Controller
{
    /**
     * GET /api/vendor/product-categories
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $query = ProductCategory::query()
            ->where('store_id', $storeId)
            ->withCount('products');

        if ($search = $request->input('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        if ($request->filled('parent_id')) {
            $pid = $request->input('parent_id');
            if ($pid === 'null' || $pid === null) {
                $query->whereNull('parent_id');
            } else {
                $query->where('parent_id', $pid);
            }
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $query->orderBy('sort_order')->orderBy('name');

        if ($request->boolean('tree')) {
            $all = $query->get();
            $byParent = $all->groupBy('parent_id');

            $roots = $all->whereNull('parent_id')->values();
            $tree = $roots->map(function ($root) use ($byParent) {
                $root->setRelation('children', $byParent->get($root->id, collect())->values());

                return $root;
            });

            return ApiResponse::success($tree->values(), 'Categories fetched.');
        }

        $perPage = min((int) $request->input('per_page', 50), 200);
        $paginated = $query->paginate($perPage);

        return ApiResponse::success([
            'categories' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'per_page' => $paginated->perPage(),
                'last_page' => $paginated->lastPage(),
                'total' => $paginated->total(),
            ],
        ], 'Categories fetched.');
    }

    /**
     * POST /api/vendor/product-categories
     */
    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $store = $this->currentStore($request);

        $data = $request->validated();

        // Enforce max depth of 2 levels (parent -> child, no grand-children)
        if (! empty($data['parent_id'])) {
            $parent = ProductCategory::where('store_id', $store->id)->find($data['parent_id']);
            if ($parent && $parent->parent_id !== null) {
                return ApiResponse::error('Categories can only be nested two levels deep.', 422);
            }
        }

        $data['store_id'] = $store->id;
        $data['slug'] = $data['slug'] ?? $this->generateUniqueSlug($data['name'], $store->id);
        $data['is_active'] = $data['is_active'] ?? true;
        $data['sort_order'] = $data['sort_order'] ?? 0;

        $category = ProductCategory::create($data);

        return ApiResponse::success($category, 'Category created.', 201);
    }

    /**
     * GET /api/vendor/product-categories/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $category = ProductCategory::where('store_id', $storeId)
            ->with(['children', 'parent'])
            ->withCount('products')
            ->find($id);

        if (! $category) {
            return ApiResponse::error('Category not found.', 404);
        }

        return ApiResponse::success($category, 'Category fetched.');
    }

    /**
     * PUT /api/vendor/product-categories/{id}
     */
    public function update(UpdateCategoryRequest $request, int $id): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $category = ProductCategory::where('store_id', $storeId)->find($id);

        if (! $category) {
            return ApiResponse::error('Category not found.', 404);
        }

        $data = $request->validated();

        if (array_key_exists('parent_id', $data) && ! empty($data['parent_id'])) {
            if ((int) $data['parent_id'] === $category->id) {
                return ApiResponse::error('A category cannot be its own parent.', 422);
            }

            $parent = ProductCategory::where('store_id', $storeId)->find($data['parent_id']);
            if ($parent && $parent->parent_id !== null) {
                return ApiResponse::error('Categories can only be nested two levels deep.', 422);
            }

            // Prevent moving a parent under its own child
            if ($category->children()->where('id', $data['parent_id'])->exists()) {
                return ApiResponse::error('Cannot move a category under its own child.', 422);
            }
        }

        $category->update($data);

        return ApiResponse::success($category->fresh(), 'Category updated.');
    }

    /**
     * DELETE /api/vendor/product-categories/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $category = ProductCategory::where('store_id', $storeId)->find($id);

        if (! $category) {
            return ApiResponse::error('Category not found.', 404);
        }

        DB::transaction(function () use ($category) {
            // Soft-delete children, then the parent
            $category->children()->each(fn ($child) => $child->delete());
            $category->delete();
        });

        return ApiResponse::success(null, 'Category deleted.');
    }

    /**
     * POST /api/vendor/product-categories/reorder
     */
    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer'],
            'items.*.sort_order' => ['required', 'integer'],
        ]);

        $storeId = $this->currentStoreId($request);

        DB::transaction(function () use ($validated, $storeId) {
            foreach ($validated['items'] as $item) {
                ProductCategory::where('store_id', $storeId)
                    ->where('id', $item['id'])
                    ->update(['sort_order' => $item['sort_order']]);
            }
        });

        return ApiResponse::success(null, 'Categories reordered.');
    }

    protected function generateUniqueSlug(string $name, int $storeId, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: 'category';
        $slug = $base;
        $i = 1;

        while (
            ProductCategory::withTrashed()
                ->where('store_id', $storeId)
                ->where('slug', $slug)
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = $base.'-'.(++$i);
        }

        return $slug;
    }
}
