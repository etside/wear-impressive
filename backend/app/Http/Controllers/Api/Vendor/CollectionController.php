<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Vendor\Collections\StoreCollectionRequest;
use App\Http\Requests\Vendor\Collections\UpdateCollectionRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Collection;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * @group Vendor Dashboard
 */
class CollectionController extends Controller
{
    /**
     * GET /api/vendor/collections
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $query = Collection::query()
            ->where('store_id', $storeId)
            ->withCount('products');

        if ($search = $request->input('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        $query->orderBy('created_at', 'desc');

        $perPage = min((int) $request->input('per_page', 20), 100);
        $paginated = $query->paginate($perPage);

        return ApiResponse::success([
            'collections' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'per_page' => $paginated->perPage(),
                'last_page' => $paginated->lastPage(),
                'total' => $paginated->total(),
            ],
        ], 'Collections fetched.');
    }

    /**
     * POST /api/vendor/collections
     */
    public function store(StoreCollectionRequest $request): JsonResponse
    {
        $store = $this->currentStore($request);

        $data = $request->validated();
        $productIds = $data['product_ids'] ?? [];
        unset($data['product_ids']);

        $data['store_id'] = $store->id;
        $data['slug'] = $data['slug'] ?? $this->generateUniqueSlug($data['name'], $store->id);
        $data['type'] = $data['type'] ?? 'manual';
        $data['status'] = $data['status'] ?? 'draft';

        $collection = DB::transaction(function () use ($data, $productIds, $store) {
            /** @var Collection $collection */
            $collection = Collection::create($data);

            if (! empty($productIds) && $collection->type === 'manual') {
                $valid = Product::where('store_id', $store->id)
                    ->whereIn('id', $productIds)
                    ->pluck('id')
                    ->all();

                if (! empty($valid)) {
                    $attach = [];
                    foreach ($valid as $i => $pid) {
                        $attach[$pid] = ['position' => $i];
                    }
                    $collection->products()->attach($attach);
                    $collection->update(['product_count' => count($valid)]);
                }
            }

            return $collection;
        });

        $collection->load('products:id,name,slug');

        return ApiResponse::success($collection, 'Collection created.', 201);
    }

    /**
     * GET /api/vendor/collections/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $collection = Collection::where('store_id', $storeId)
            ->with(['products:id,name,slug,price,featured_image,status'])
            ->withCount('products')
            ->find($id);

        if (! $collection) {
            return ApiResponse::error('Collection not found.', 404);
        }

        return ApiResponse::success($collection, 'Collection fetched.');
    }

    /**
     * PUT /api/vendor/collections/{id}
     */
    public function update(UpdateCollectionRequest $request, int $id): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $collection = Collection::where('store_id', $storeId)->find($id);

        if (! $collection) {
            return ApiResponse::error('Collection not found.', 404);
        }

        $collection->update($request->validated());

        return ApiResponse::success($collection->fresh(), 'Collection updated.');
    }

    /**
     * DELETE /api/vendor/collections/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $collection = Collection::where('store_id', $storeId)->find($id);

        if (! $collection) {
            return ApiResponse::error('Collection not found.', 404);
        }

        $collection->delete();

        return ApiResponse::success(null, 'Collection deleted.');
    }

    /**
     * POST /api/vendor/collections/{id}/products
     */
    public function addProducts(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'product_ids' => ['required', 'array', 'min:1'],
            'product_ids.*' => ['integer'],
        ]);

        $storeId = $this->currentStoreId($request);
        $collection = Collection::where('store_id', $storeId)->find($id);

        if (! $collection) {
            return ApiResponse::error('Collection not found.', 404);
        }

        if ($collection->type !== 'manual') {
            return ApiResponse::error('Only manual collections can have products attached.', 422);
        }

        $validIds = Product::where('store_id', $storeId)
            ->whereIn('id', $validated['product_ids'])
            ->pluck('id')
            ->all();

        if (empty($validIds)) {
            return ApiResponse::error('No valid products found.', 422);
        }

        $startPos = (int) $collection->products()->max('position');
        $attach = [];
        foreach ($validIds as $i => $pid) {
            $attach[$pid] = ['position' => $startPos + $i + 1];
        }

        $collection->products()->syncWithoutDetaching($attach);
        $collection->update(['product_count' => $collection->products()->count()]);

        return ApiResponse::success([
            'attached' => count($validIds),
            'product_count' => $collection->product_count,
        ], 'Products attached.');
    }

    /**
     * DELETE /api/vendor/collections/{id}/products
     */
    public function removeProducts(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'product_ids' => ['required', 'array', 'min:1'],
            'product_ids.*' => ['integer'],
        ]);

        $storeId = $this->currentStoreId($request);
        $collection = Collection::where('store_id', $storeId)->find($id);

        if (! $collection) {
            return ApiResponse::error('Collection not found.', 404);
        }

        $detached = $collection->products()->detach($validated['product_ids']);
        $collection->update(['product_count' => $collection->products()->count()]);

        return ApiResponse::success([
            'detached' => $detached,
            'product_count' => $collection->product_count,
        ], 'Products removed.');
    }

    protected function generateUniqueSlug(string $name, int $storeId, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: 'collection';
        $slug = $base;
        $i = 1;

        while (
            Collection::where('store_id', $storeId)
                ->where('slug', $slug)
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = $base.'-'.(++$i);
        }

        return $slug;
    }
}
