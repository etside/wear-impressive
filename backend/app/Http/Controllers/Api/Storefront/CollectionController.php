<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Storefront (Public)
 */
class CollectionController extends Controller
{
    /**
     * GET /api/store/collections
     */
    public function index(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $collections = Collection::query()
            ->where('store_id', $store->id)
            ->where('status', 'active')
            ->orderBy('name')
            ->get();

        return ApiResponse::success($collections, 'Collections loaded.');
    }

    /**
     * GET /api/store/collections/{slug}
     */
    public function show(Request $request, string $slug): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $collection = Collection::query()
            ->where('store_id', $store->id)
            ->where('slug', $slug)
            ->where('status', 'active')
            ->first();

        if (! $collection) {
            return ApiResponse::error('Collection not found.', 404);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);

        $products = $collection->products()
            ->where('status', 'active')
            ->with([
                'productImages' => fn ($q) => $q->orderBy('position'),
                'brand',
                'category',
            ])
            ->orderBy('collection_product.position')
            ->paginate($perPage);

        return ApiResponse::success([
            'collection' => $collection,
            'products' => $products,
        ], 'Collection loaded.');
    }
}
