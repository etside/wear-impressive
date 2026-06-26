<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Storefront (Public)
 */
class ProductCategoryController extends Controller
{
    /**
     * GET /api/store/categories
     *
     * Returns parent categories only by default (set ?all=1 for every category).
     */
    public function index(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $query = ProductCategory::query()
            ->where('store_id', $store->id)
            ->where('is_active', true);

        if (! $request->boolean('all')) {
            $query->whereNull('parent_id');
        }

        // Count active products per category. Two counts:
        // - products_count: products where category_id = this category's id (parent assignment)
        // - sub_category_products_count: products where sub_category_id = this category's id
        // The frontend uses sub_category_products_count for subcategories so the filter
        // sidebar shows real counts even when products are filed under a parent category_id.
        $categories = $query->orderBy('sort_order')->orderBy('name')
            ->withCount(['products' => fn ($q) => $q->where('status', 'active')])
            ->withCount(['subCategoryProducts as sub_category_products_count' => fn ($q) => $q->where('status', 'active')])
            ->with(['children' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')])
            ->get();

        return ApiResponse::success($categories, 'Categories loaded.');
    }

    /**
     * GET /api/store/categories/{slug}
     */
    public function show(Request $request, string $slug): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $category = ProductCategory::query()
            ->where('store_id', $store->id)
            ->where('slug', $slug)
            ->where('is_active', true)
            ->with(['children' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')])
            ->first();

        if (! $category) {
            return ApiResponse::error('Category not found.', 404);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);

        $products = Product::query()
            ->where('store_id', $store->id)
            ->where('status', 'active')
            ->where(function ($q) use ($category) {
                $q->where('category_id', $category->id)
                    ->orWhere('sub_category_id', $category->id);
            })
            ->with([
                'productImages' => fn ($q) => $q->orderBy('position'),
                'brand',
            ])
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return ApiResponse::success([
            'category' => $category,
            'products' => $products,
        ], 'Category loaded.');
    }
}
