<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Helpers\BarcodeGenerator;
use App\Http\Controllers\Controller;
use App\Http\Requests\Vendor\Products\StoreProductRequest;
use App\Http\Requests\Vendor\Products\UpdateProductRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\Product;
use App\Models\ProductBundleComponent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * @group Vendor Dashboard
 */
class ProductController extends Controller
{
    /**
     * GET /api/vendor/products
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $query = Product::query()
            ->where('store_id', $storeId)
            ->with(['category:id,name,slug', 'brand:id,name,slug', 'variants']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->input('category_id'));
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->input('brand_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('has_variants')) {
            $query->where('has_variants', $request->boolean('has_variants'));
        }

        // Frontend filter chip: All / Physical / Digital / Bundle.
        if ($type = $request->input('product_type')) {
            $query->where('product_type', $type);
        }

        if ($request->filled('in_stock')) {
            if ($request->boolean('in_stock')) {
                $query->where('stock', '>', 0);
            } else {
                $query->where('stock', '<=', 0);
            }
        }

        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');
        $allowedSorts = ['name', 'price', 'stock', 'created_at', 'updated_at'];

        if (! in_array($sortBy, $allowedSorts, true)) {
            $sortBy = 'created_at';
        }

        if (! in_array(strtolower($sortDir), ['asc', 'desc'], true)) {
            $sortDir = 'desc';
        }

        $query->orderBy($sortBy, $sortDir);

        $perPage = min((int) $request->input('per_page', 20), 100);
        $paginated = $query->paginate($perPage);

        $counts = [
            'total' => Product::where('store_id', $storeId)->count(),
            'active' => Product::where('store_id', $storeId)->where('status', 'active')->count(),
            'draft' => Product::where('store_id', $storeId)->where('status', 'draft')->count(),
            'archived' => Product::where('store_id', $storeId)->where('status', 'archived')->count(),
            'out_of_stock' => Product::where('store_id', $storeId)->where('stock', '<=', 0)->count(),
            'physical' => Product::where('store_id', $storeId)->where('product_type', 'physical')->count(),
            'digital' => Product::where('store_id', $storeId)->where('product_type', 'digital')->count(),
            'bundle' => Product::where('store_id', $storeId)->where('product_type', 'bundle')->count(),
        ];

        return ApiResponse::success([
            'products' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'per_page' => $paginated->perPage(),
                'last_page' => $paginated->lastPage(),
                'total' => $paginated->total(),
            ],
            'counts' => $counts,
        ], 'Products fetched.');
    }

    /**
     * POST /api/vendor/products
     */
    public function store(StoreProductRequest $request): JsonResponse
    {
        $store = $this->currentStore($request);
        $vendor = auth('vendor')->user() ?? $this->currentUser();

        $data = $request->validated();

        $product = DB::transaction(function () use ($data, $store, $vendor) {
            $payload = $data;

            $payload['store_id'] = $store->id;
            $payload['vendor_id'] = $vendor->id ?? ($vendor->getKey() ?? null);

            // Slug
            if (empty($payload['slug'])) {
                $payload['slug'] = $this->generateUniqueSlug($payload['name'], $store->id);
            }

            // Barcode auto-generation
            if (empty($payload['barcode'])) {
                $payload['barcode'] = BarcodeGenerator::ean13($store->id);
            }

            // Defaults
            $payload['status'] = $payload['status'] ?? 'draft';
            $payload['product_type'] = $payload['product_type'] ?? 'physical';
            $payload['has_variants'] = $payload['has_variants'] ?? false;
            $payload['track_inventory'] = $payload['track_inventory'] ?? true;
            $payload['stock'] = $payload['stock'] ?? 0;

            $variantsData = $payload['variants'] ?? null;
            $bundleComponents = $payload['bundle_components'] ?? null;
            unset($payload['variants'], $payload['bundle_components']);

            // Bundles don't carry their own variants/stock — pricing comes
            // from the bundle_* fields and stock is derived from components
            // at runtime. Force the relevant flags to safe defaults.
            $isBundle = ($payload['product_type'] ?? null) === 'bundle';
            if ($isBundle) {
                $payload['has_variants'] = false;
                $payload['track_inventory'] = false;
                $payload['stock'] = 0;
                $payload['price'] = $payload['price'] ?? 0;
            }

            if ($payload['status'] === 'active' && empty($payload['published_at'])) {
                $payload['published_at'] = now();
            }

            /** @var Product $product */
            $product = Product::create($payload);

            // Variants (only for non-bundle products with has_variants=true).
            if (! $isBundle && ! empty($variantsData) && ! empty($payload['has_variants'])) {
                foreach ($variantsData as $variantData) {
                    unset($variantData['id']);
                    $variantData['product_id'] = $product->id;
                    $variantData['is_active'] = $variantData['is_active'] ?? true;
                    $variantData['stock'] = $variantData['stock'] ?? 0;
                    $product->variants()->create($variantData);
                }
            }

            // Bundle components.
            if ($isBundle && ! empty($bundleComponents)) {
                foreach ($bundleComponents as $i => $row) {
                    ProductBundleComponent::create([
                        'bundle_product_id' => $product->id,
                        'component_product_id' => (int) $row['component_product_id'],
                        'quantity' => (int) ($row['quantity'] ?? 1),
                        'sort_order' => (int) ($row['sort_order'] ?? $i),
                        'is_required' => $row['is_required'] ?? true,
                    ]);
                }
            }

            // Initial BranchStock records for main branch — bundles skip
            // this since they have no own stock.
            if (! $isBundle) {
                $this->syncMainBranchStock($product);
            }

            return $product;
        });

        $product->load(['category', 'brand', 'variants', 'productImages']);

        return ApiResponse::success($product, 'Product created.', 201);
    }

    /**
     * GET /api/vendor/products/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $product = Product::query()
            ->where('store_id', $storeId)
            ->with([
                'category',
                'subCategory',
                'brand',
                'variants',
                'productImages',
                'branchStocks.branch',
                // Eager-load bundle components with the underlying product
                // (and its variants + key columns) so the dashboard edit
                // page can render the components list without N+1 queries.
                'bundleComponents.component:id,name,slug,price,discount,discount_type,featured_image,images,product_type,stock,has_variants',
                'bundleComponents.component.variants',
            ])
            ->withCount('reviews')
            ->find($id);

        if (! $product) {
            return ApiResponse::error('Product not found.', 404);
        }

        $avgRating = $product->reviews()->avg('rating');
        $product->setAttribute('average_rating', $avgRating ? round((float) $avgRating, 2) : null);

        return ApiResponse::success($product, 'Product fetched.');
    }

    /**
     * PUT /api/vendor/products/{id}
     */
    public function update(UpdateProductRequest $request, int $id): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $product = Product::where('store_id', $storeId)->find($id);

        if (! $product) {
            return ApiResponse::error('Product not found.', 404);
        }

        $data = $request->validated();

        $product = DB::transaction(function () use ($data, $product) {
            $payload = $data;
            $variantsData = $payload['variants'] ?? null;
            $bundleComponents = $payload['bundle_components'] ?? null;
            unset($payload['variants'], $payload['bundle_components']);

            if (isset($payload['name']) && empty($payload['slug']) && $payload['name'] !== $product->name) {
                $payload['slug'] = $this->generateUniqueSlug($payload['name'], $product->store_id, $product->id);
            }

            if (isset($payload['status']) && $payload['status'] === 'active' && ! $product->published_at) {
                $payload['published_at'] = now();
            }

            $effectiveType = $payload['product_type'] ?? $product->product_type;
            $isBundle = $effectiveType === 'bundle';

            // Bundles never carry their own variants/stock — even on update.
            if ($isBundle) {
                $payload['has_variants'] = false;
                $payload['track_inventory'] = false;
                $payload['stock'] = 0;
            }

            $product->update($payload);

            if (! $isBundle && $variantsData !== null) {
                $incomingIds = [];

                foreach ($variantsData as $variantData) {
                    $variantId = $variantData['id'] ?? null;
                    unset($variantData['id']);

                    if ($variantId) {
                        $variant = $product->variants()->where('id', $variantId)->first();
                        if ($variant) {
                            $variant->update($variantData);
                            $incomingIds[] = $variant->id;
                        }
                    } else {
                        $variantData['is_active'] = $variantData['is_active'] ?? true;
                        $variantData['stock'] = $variantData['stock'] ?? 0;
                        $new = $product->variants()->create($variantData);
                        $incomingIds[] = $new->id;
                    }
                }

                // Delete variants not in the payload
                if (! empty($incomingIds)) {
                    $product->variants()->whereNotIn('id', $incomingIds)->delete();
                } else {
                    $product->variants()->delete();
                }
            }

            // Sync bundle components — replace strategy. Simpler than diff
            // and components are cheap (just FK + qty/sort/required flags).
            if ($isBundle && $bundleComponents !== null) {
                $product->bundleComponents()->delete();
                foreach ($bundleComponents as $i => $row) {
                    ProductBundleComponent::create([
                        'bundle_product_id' => $product->id,
                        'component_product_id' => (int) $row['component_product_id'],
                        'quantity' => (int) ($row['quantity'] ?? 1),
                        'sort_order' => (int) ($row['sort_order'] ?? $i),
                        'is_required' => $row['is_required'] ?? true,
                    ]);
                }
            }

            // Keep per-branch stock in sync with the product/variant totals so
            // the Inventory dashboard (which reads branch_stock) matches the
            // Products list (which reads products.stock). Without this, edits
            // and imports drift the two apart.
            if (! $isBundle) {
                $this->syncMainBranchStock($product->fresh(['variants']));
            }

            return $product->fresh();
        });

        $product->load(['category', 'brand', 'variants', 'productImages']);

        return ApiResponse::success($product, 'Product updated.');
    }

    /**
     * Upsert main-branch BranchStock rows so they mirror the product's
     * current stock. For variant products each variant gets a row and the
     * phantom parent row is removed; non-variant products keep a single
     * parent row. Idempotent — safe to call on create and update.
     */
    private function syncMainBranchStock(Product $product): void
    {
        $mainBranch = Branch::where('store_id', $product->store_id)
            ->where('is_main', true)
            ->first()
            ?? Branch::where('store_id', $product->store_id)->first();

        if (! $mainBranch) {
            return;
        }

        $threshold = $product->low_stock_threshold ?? 5;

        if ($product->has_variants) {
            foreach ($product->variants as $variant) {
                BranchStock::updateOrCreate(
                    ['branch_id' => $mainBranch->id, 'product_id' => $product->id, 'variant_id' => $variant->id],
                    ['stock' => $variant->stock ?? 0, 'low_stock_threshold' => $threshold]
                );
            }
            // Drop any stale parent row left over from when the product had
            // no variants — it would otherwise show as a phantom 0-stock entry.
            BranchStock::where('branch_id', $mainBranch->id)
                ->where('product_id', $product->id)
                ->whereNull('variant_id')
                ->delete();
        } else {
            BranchStock::updateOrCreate(
                ['branch_id' => $mainBranch->id, 'product_id' => $product->id, 'variant_id' => null],
                ['stock' => $product->stock ?? 0, 'low_stock_threshold' => $threshold]
            );
            // Remove orphan variant rows if the product was switched away
            // from variants.
            BranchStock::where('branch_id', $mainBranch->id)
                ->where('product_id', $product->id)
                ->whereNotNull('variant_id')
                ->delete();
        }
    }

    /**
     * DELETE /api/vendor/products/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $product = Product::where('store_id', $storeId)->find($id);

        if (! $product) {
            return ApiResponse::error('Product not found.', 404);
        }

        $product->delete();

        return ApiResponse::success(null, 'Product deleted.');
    }

    /**
     * POST /api/vendor/products/{id}/duplicate
     */
    public function duplicate(Request $request, int $id): JsonResponse
    {
        $storeId = $this->currentStoreId($request);
        $store = $this->currentStore($request);

        $product = Product::where('store_id', $storeId)->with('variants')->find($id);

        if (! $product) {
            return ApiResponse::error('Product not found.', 404);
        }

        $copy = DB::transaction(function () use ($product, $store) {
            $attrs = $product->only([
                'store_id', 'vendor_id', 'category_id', 'sub_category_id', 'brand_id',
                'product_type', 'short_description', 'description',
                'price', 'discount', 'discount_type', 'cost_price',
                'weight_value', 'weight_unit',
                'has_variants', 'track_inventory', 'stock', 'low_stock_threshold',
                'images', 'featured_image', 'cover_image',
                'tags', 'meta_title', 'meta_description', 'url_handle',
                'digital_file_path', 'digital_file_name', 'digital_file_size',
                'download_limit', 'download_expiry_days', 'external_url',
                'is_taxable', 'tax_rate',
            ]);

            $attrs['name'] = $product->name.' (Copy)';
            $attrs['slug'] = $this->generateUniqueSlug($attrs['name'], $store->id);
            $attrs['sku'] = null;
            $attrs['barcode'] = BarcodeGenerator::ean13($store->id);
            $attrs['status'] = 'draft';
            $attrs['published_at'] = null;

            /** @var Product $copy */
            $copy = Product::create($attrs);

            foreach ($product->variants as $variant) {
                $vAttrs = $variant->only([
                    'options', 'price', 'discount', 'discount_type', 'cost_price',
                    'stock', 'image', 'sort_order', 'is_active',
                ]);
                $vAttrs['product_id'] = $copy->id;
                $vAttrs['sku'] = null;
                $vAttrs['barcode'] = null;
                $copy->variants()->create($vAttrs);
            }

            return $copy;
        });

        $copy->load(['category', 'brand', 'variants']);

        return ApiResponse::success($copy, 'Product duplicated.', 201);
    }

    /**
     * POST /api/vendor/products/bulk-delete
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_ids' => ['required', 'array', 'min:1'],
            'product_ids.*' => ['integer'],
        ]);

        $storeId = $this->currentStoreId($request);

        $deleted = Product::where('store_id', $storeId)
            ->whereIn('id', $validated['product_ids'])
            ->delete();

        return ApiResponse::success(['deleted' => $deleted], "{$deleted} product(s) deleted.");
    }

    /**
     * POST /api/vendor/products/import
     */
    public function import(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'products' => ['required', 'array', 'min:1'],
            'products.*.name' => ['required', 'string', 'max:255'],
            'products.*.price' => ['required', 'numeric', 'min:0'],
            'products.*.category_id' => ['required', 'integer'],
        ]);

        $store = $this->currentStore($request);
        $vendor = auth('vendor')->user() ?? $this->currentUser();

        $success = 0;
        $errors = [];

        DB::transaction(function () use ($validated, $store, $vendor, &$success, &$errors) {
            foreach ($validated['products'] as $index => $row) {
                try {
                    $payload = $row;
                    $payload['store_id'] = $store->id;
                    $payload['vendor_id'] = $vendor->id ?? ($vendor->getKey() ?? null);
                    $payload['slug'] = $this->generateUniqueSlug($row['name'], $store->id);
                    $payload['status'] = $row['status'] ?? 'draft';
                    $payload['product_type'] = $row['product_type'] ?? 'physical';
                    $payload['has_variants'] = false;
                    $payload['track_inventory'] = $row['track_inventory'] ?? true;
                    $payload['stock'] = $row['stock'] ?? 0;

                    if (empty($payload['barcode'])) {
                        $payload['barcode'] = BarcodeGenerator::ean13($store->id);
                    }

                    // Ensure unique SKU / barcode
                    if (! empty($payload['sku']) && Product::where('sku', $payload['sku'])->exists()) {
                        throw new \RuntimeException("SKU '{$payload['sku']}' already exists.");
                    }

                    Product::create($payload);
                    $success++;
                } catch (\Throwable $e) {
                    $errors[] = [
                        'row' => $index + 1,
                        'name' => $row['name'] ?? null,
                        'error' => $e->getMessage(),
                    ];
                }
            }
        });

        return ApiResponse::success([
            'success_count' => $success,
            'error_count' => count($errors),
            'errors' => $errors,
        ], 'Import finished.');
    }

    /**
     * Generate a unique slug scoped to the store.
     */
    protected function generateUniqueSlug(string $name, int $storeId, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: 'product';
        $slug = $base;
        $i = 1;

        while (
            Product::withTrashed()
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
