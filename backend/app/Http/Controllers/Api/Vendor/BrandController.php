<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Vendor\Brands\StoreBrandRequest;
use App\Http\Requests\Vendor\Brands\UpdateBrandRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * @group Vendor Dashboard
 */
class BrandController extends Controller
{
    /**
     * GET /api/vendor/brands
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $query = Brand::query()
            ->where('store_id', $storeId)
            ->with(['category:id,name,slug'])
            ->withCount('products');

        if ($search = $request->input('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->input('category_id'));
        }

        if ($request->filled('featured')) {
            $query->where('featured', $request->boolean('featured'));
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $query->orderBy('name');

        $perPage = min((int) $request->input('per_page', 50), 200);
        $paginated = $query->paginate($perPage);

        return ApiResponse::success([
            'brands' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'per_page' => $paginated->perPage(),
                'last_page' => $paginated->lastPage(),
                'total' => $paginated->total(),
            ],
        ], 'Brands fetched.');
    }

    /**
     * POST /api/vendor/brands
     */
    public function store(StoreBrandRequest $request): JsonResponse
    {
        $store = $this->currentStore($request);

        $data = $request->validated();
        $data['store_id'] = $store->id;
        $data['slug'] = $data['slug'] ?? $this->generateUniqueSlug($data['name'], $store->id);
        $data['is_active'] = $data['is_active'] ?? true;
        $data['featured'] = $data['featured'] ?? false;

        $brand = Brand::create($data);

        return ApiResponse::success($brand, 'Brand created.', 201);
    }

    /**
     * GET /api/vendor/brands/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $brand = Brand::where('store_id', $storeId)
            ->with(['category', 'subCategory'])
            ->withCount('products')
            ->find($id);

        if (! $brand) {
            return ApiResponse::error('Brand not found.', 404);
        }

        return ApiResponse::success($brand, 'Brand fetched.');
    }

    /**
     * PUT /api/vendor/brands/{id}
     */
    public function update(UpdateBrandRequest $request, int $id): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $brand = Brand::where('store_id', $storeId)->find($id);

        if (! $brand) {
            return ApiResponse::error('Brand not found.', 404);
        }

        $brand->update($request->validated());

        return ApiResponse::success($brand->fresh(), 'Brand updated.');
    }

    /**
     * DELETE /api/vendor/brands/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $brand = Brand::where('store_id', $storeId)->find($id);

        if (! $brand) {
            return ApiResponse::error('Brand not found.', 404);
        }

        $brand->delete();

        return ApiResponse::success(null, 'Brand deleted.');
    }

    /**
     * POST /api/vendor/brands/{id}/toggle-featured
     */
    public function toggleFeatured(Request $request, int $id): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $brand = Brand::where('store_id', $storeId)->find($id);

        if (! $brand) {
            return ApiResponse::error('Brand not found.', 404);
        }

        $brand->update(['featured' => ! $brand->featured]);

        return ApiResponse::success($brand->fresh(), 'Brand featured status toggled.');
    }

    protected function generateUniqueSlug(string $name, int $storeId, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: 'brand';
        $slug = $base;
        $i = 1;

        while (
            Brand::withTrashed()
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
