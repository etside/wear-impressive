<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Brand;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Storefront (Public)
 */
class BrandController extends Controller
{
    /**
     * GET /api/store/brands
     */
    public function index(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $query = Brand::query()
            ->where('store_id', $store->id)
            ->where('is_active', true);

        if ($request->boolean('featured')) {
            $query->where('featured', true);
        }

        $brands = $query->orderBy('name')->get();

        return ApiResponse::success($brands, 'Brands loaded.');
    }

    /**
     * GET /api/store/brands/{slug}
     */
    public function show(Request $request, string $slug): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $brand = Brand::query()
            ->where('store_id', $store->id)
            ->where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if (! $brand) {
            return ApiResponse::error('Brand not found.', 404);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);

        $products = Product::query()
            ->where('store_id', $store->id)
            ->where('status', 'active')
            ->where('brand_id', $brand->id)
            ->with([
                'productImages' => fn ($q) => $q->orderBy('position'),
                'category',
            ])
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return ApiResponse::success([
            'brand' => $brand,
            'products' => $products,
        ], 'Brand loaded.');
    }
}
