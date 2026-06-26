<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Product;
use App\Models\ProductReview;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Storefront (Public)
 */
class ProductController extends Controller
{
    /**
     * GET /api/store/products
     */
    public function index(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $query = Product::query()
            ->where('store_id', $store->id)
            ->where('status', 'active')
            ->with([
                'variants' => fn ($q) => $q->where('is_active', true),
                'productImages' => fn ($q) => $q->orderBy('position'),
                'brand',
                'category',
            ]);

        if ($request->filled('category_id')) {
            $query->where('category_id', (int) $request->input('category_id'));
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', (int) $request->input('brand_id'));
        }

        if ($request->filled('search')) {
            $term = (string) $request->input('search');
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('short_description', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%")
                    ->orWhere('sku', 'like', "%{$term}%");
            });
        }

        if ($request->filled('price_min')) {
            $query->where('price', '>=', (float) $request->input('price_min'));
        }

        if ($request->filled('price_max')) {
            $query->where('price', '<=', (float) $request->input('price_max'));
        }

        if ($request->filled('tags')) {
            $tags = is_array($request->input('tags'))
                ? $request->input('tags')
                : explode(',', (string) $request->input('tags'));

            foreach ($tags as $tag) {
                $tag = trim($tag);
                if ($tag === '') {
                    continue;
                }
                $query->whereJsonContains('tags', $tag);
            }
        }

        if ($request->boolean('featured')) {
            $query->whereJsonContains('tags', 'featured');
        }

        if ($request->boolean('in_stock')) {
            $query->where(function ($q) {
                $q->where('track_inventory', false)
                    ->orWhere('stock', '>', 0);
            });
        }

        $sort = (string) $request->input('sort', 'newest');

        switch ($sort) {
            case 'featured':
                // Featured = product has the "featured" tag. Keep this portable by
                // selecting featured-first in PHP after fetch would break pagination,
                // so instead we order by a simple boolean expression that works
                // across MySQL and SQLite.
                $query->orderByRaw("CASE WHEN tags LIKE '%\"featured\"%' THEN 0 ELSE 1 END")
                    ->orderByDesc('created_at');
                break;
            case 'price_asc':
                $query->orderBy('price', 'asc');
                break;
            case 'price_desc':
                $query->orderBy('price', 'desc');
                break;
            case 'popular':
                $query->withCount('orderItems')->orderByDesc('order_items_count');
                break;
            case 'newest':
            default:
                $query->orderByDesc('published_at')->orderByDesc('created_at');
                break;
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        $paginator = $query->paginate($perPage);

        $paginator->getCollection()->transform(fn ($product) => $this->transformListing($product));

        return ApiResponse::success($paginator, 'Products loaded.');
    }

    /**
     * GET /api/store/products/{slug}
     */
    public function show(Request $request, string $slug): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        // Accept either slug or numeric id — some theme ProductCards only
        // have the id at hand, so we fall back gracefully.
        $product = Product::query()
            ->where('store_id', $store->id)
            ->where('status', 'active')
            ->where(function ($q) use ($slug) {
                $q->where('slug', $slug);
                if (ctype_digit($slug)) {
                    $q->orWhere('id', (int) $slug);
                }
            })
            ->with([
                'variants' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
                'productImages' => fn ($q) => $q->orderBy('position'),
                'category',
                'brand',
                // Bundle components — load each component product with its
                // active variants + images so the storefront can render
                // a full picker per component without a second round-trip.
                'bundleComponents.component' => fn ($q) => $q->where('status', 'active'),
                'bundleComponents.component.variants' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
                'bundleComponents.component.productImages' => fn ($q) => $q->orderBy('position'),
            ])
            ->first();

        if (! $product) {
            return ApiResponse::error('Product not found.', 404);
        }

        // Similar products (same category, excluding this one).
        $similar = Product::query()
            ->where('store_id', $store->id)
            ->where('status', 'active')
            ->where('category_id', $product->category_id)
            ->where('id', '!=', $product->id)
            ->with(['productImages' => fn ($q) => $q->orderBy('position')])
            ->limit(4)
            ->get()
            ->map(fn ($p) => $this->transformListing($p));

        // Reviews (approved), paginated 5 per page. Eager-load the customer
        // (just name + avatar — never email/phone) so the storefront can
        // attribute "Reviewed by Rashida K." without an N+1.
        $reviewsPaginator = ProductReview::query()
            ->where('store_id', $store->id)
            ->where('product_id', $product->id)
            ->where('is_approved', true)
            ->with(['customer:id,name,avatar'])
            ->orderByDesc('created_at')
            ->paginate(5);

        // Reviews summary.
        $approvedReviews = ProductReview::query()
            ->where('store_id', $store->id)
            ->where('product_id', $product->id)
            ->where('is_approved', true);

        $reviewsSummary = [
            'count' => (clone $approvedReviews)->count(),
            'average' => round((float) (clone $approvedReviews)->avg('rating'), 2),
            'distribution' => [
                5 => (clone $approvedReviews)->where('rating', 5)->count(),
                4 => (clone $approvedReviews)->where('rating', 4)->count(),
                3 => (clone $approvedReviews)->where('rating', 3)->count(),
                2 => (clone $approvedReviews)->where('rating', 2)->count(),
                1 => (clone $approvedReviews)->where('rating', 1)->count(),
            ],
        ];

        $data = $this->transformDetail($product);
        $data['similar_products'] = $similar;
        $data['reviews'] = $reviewsPaginator;
        $data['reviews_summary'] = $reviewsSummary;

        return ApiResponse::success($data, 'Product loaded.');
    }

    /**
     * GET /api/store/products/search
     */
    public function search(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $term = (string) $request->input('q', '');

        $query = Product::query()
            ->where('store_id', $store->id)
            ->where('status', 'active')
            ->with([
                'productImages' => fn ($q) => $q->orderBy('position'),
                'brand',
                'category',
            ]);

        if ($term !== '') {
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('short_description', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%")
                    ->orWhere('sku', 'like', "%{$term}%")
                    ->orWhereJsonContains('tags', $term);
            });
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        $paginator = $query->orderByDesc('created_at')->paginate($perPage);

        $paginator->getCollection()->transform(fn ($p) => $this->transformListing($p));

        return ApiResponse::success($paginator, 'Search results.');
    }

    /**
     * Transform a product for listing responses — strips sensitive/internal fields.
     *
     * For bundle products, the `price` column is always 0 (bundles don't carry
     * their own SKU price). We surface the configured bundle price as `price`
     * so theme product cards / listings render the correct number without
     * needing to know about the bundle data model.
     */
    protected function transformListing(Product $product): array
    {
        $array = $product->toArray();

        unset(
            $array['cost_price'],
            $array['digital_file_path'],
            $array['digital_file_size'],
            $array['download_limit'],
            $array['download_expiry_days'],
            $array['low_stock_threshold'],
        );

        if (isset($array['variants']) && is_array($array['variants'])) {
            $array['variants'] = array_map(function ($v) {
                $v['options'] = $this->normalizeVariantOptions($v['options'] ?? []);
                return $v;
            }, $array['variants']);
        }

        if ($product->isBundle()) {
            $bundlePrice = (float) ($product->bundle_price ?? 0);
            $compareAt = $product->bundle_compare_at_price !== null
                ? (float) $product->bundle_compare_at_price
                : null;

            // Map bundle pricing into the standard `price`/`discount`/`discount_type`
            // shape so theme cards (Sale/strikethrough logic) work as-is.
            $array['price'] = number_format($bundlePrice, 2, '.', '');
            if ($compareAt !== null && $compareAt > $bundlePrice) {
                // Display compare-at as the original "before" price by overriding
                // `price` to the compare-at and putting the actual saving in
                // `discount` as a flat amount. Cards then show:
                //   price = bundle_price, originalPrice = compare_at
                $array['price'] = number_format($compareAt, 2, '.', '');
                $array['discount'] = number_format(max(0, $compareAt - $bundlePrice), 2, '.', '');
                $array['discount_type'] = 'flat';
            } else {
                $array['discount'] = null;
                $array['discount_type'] = null;
            }
        }

        return $array;
    }

    /**
     * Transform a product for detail responses.
     */
    protected function transformDetail(Product $product): array
    {
        $array = $this->transformListing($product);

        // Strip cost and normalize options on variants.
        if (isset($array['variants']) && is_array($array['variants'])) {
            $array['variants'] = array_map(function ($v) {
                unset($v['cost_price']);
                $v['options'] = $this->normalizeVariantOptions($v['options'] ?? []);

                return $v;
            }, $array['variants']);
        }

        // Bundle products: shape a `bundle` block on the response with the
        // computed sums so the storefront can render the savings line
        // ("৳1,500   ৳2,000  Save ৳500") without re-doing the math.
        if ($product->isBundle() && $product->relationLoaded('bundleComponents')) {
            $componentsOut = [];
            $minSum = 0.0;
            $maxSum = 0.0;

            foreach ($product->bundleComponents as $bc) {
                $cp = $bc->component;
                if (! $cp) {
                    continue; // component product was archived/deleted
                }

                $variants = $cp->relationLoaded('variants') ? $cp->variants : collect();
                $hasVariants = (bool) $cp->has_variants && $variants->isNotEmpty();

                // Determine min/max effective price across this component.
                $prices = $hasVariants
                    ? $variants->map(fn ($v) => $this->effectivePrice($cp, $v))->all()
                    : [$this->effectivePrice($cp, null)];

                $compMin = $prices ? min($prices) : 0;
                $compMax = $prices ? max($prices) : 0;
                $qty = (int) $bc->quantity;

                $minSum += $compMin * $qty;
                $maxSum += $compMax * $qty;

                $componentsOut[] = [
                    'id' => $bc->id,
                    'component_product_id' => $cp->id,
                    'quantity' => $qty,
                    'sort_order' => (int) $bc->sort_order,
                    'is_required' => (bool) $bc->is_required,
                    'product' => [
                        'id' => $cp->id,
                        'name' => $cp->name,
                        'slug' => $cp->slug,
                        'product_type' => $cp->product_type,
                        'price' => $cp->price,
                        'discount' => $cp->discount,
                        'discount_type' => $cp->discount_type,
                        'featured_image' => $cp->featured_image,
                        'images' => $cp->images,
                        'has_variants' => $hasVariants,
                        'stock' => $cp->stock,
                        'variants' => $hasVariants ? $variants->map(function ($v) use ($cp) {
                            return [
                                'id' => $v->id,
                                'sku' => $v->sku,
                                'options' => $v->options,
                                'price' => $v->price,
                                'discount' => $v->discount,
                                'discount_type' => $v->discount_type,
                                'stock' => $v->stock,
                                'image' => $v->image,
                                'effective_price' => $this->effectivePrice($cp, $v),
                            ];
                        })->values() : [],
                    ],
                ];
            }

            $strategy = $product->bundle_pricing_strategy ?? 'sum';
            // Customer-facing "bundle price" is computed from MAX sum so
            // the storefront default display reflects "highest possible"
            // when no specific variants are picked. Once a customer selects
            // variants, the frontend reprices using each component's
            // effective_price.
            $bundlePrice = match ($strategy) {
                'fixed' => (float) ($product->bundle_price ?? 0),
                'percent' => round($maxSum * (1 - ((float) $product->bundle_discount_percent / 100)), 2),
                default => $maxSum, // 'sum'
            };

            $array['bundle'] = [
                'pricing_strategy' => $strategy,
                'bundle_price' => $bundlePrice,
                'bundle_discount_percent' => $product->bundle_discount_percent
                    ? (float) $product->bundle_discount_percent
                    : null,
                'compare_at_price' => $product->bundle_compare_at_price
                    ? (float) $product->bundle_compare_at_price
                    : null,
                'component_sum_min' => round($minSum, 2),
                'component_sum_max' => round($maxSum, 2),
                'savings_max' => round(max(0, $maxSum - $bundlePrice), 2),
                'components' => $componentsOut,
            ];
        }

        return $array;
    }

    /**
     * Normalize variant options to a flat {label: value} map.
     *
     * The DB may store options as an indexed array of records
     * [{option_label, option_value, ...}, ...] (legacy format) or already
     * as an associative {label: value} map (current format). Both are
     * handled here so the storefront always receives a consistent shape.
     */
    protected function normalizeVariantOptions(mixed $raw): array
    {
        if (! is_array($raw) || empty($raw)) {
            return [];
        }

        // Detect indexed array of option-record objects.
        if (array_is_list($raw) && isset($raw[0]) && is_array($raw[0]) && array_key_exists('option_label', $raw[0])) {
            $map = [];
            foreach ($raw as $opt) {
                $label = $opt['option_label'] ?? null;
                $value = $opt['option_value'] ?? null;
                if ($label !== null) {
                    $map[$label] = $value ?? '';
                }
            }
            return $map;
        }

        return $raw;
    }

    /**
     * Apply product/variant level discount to compute the effective
     * customer-facing price. Mirrors CartController::effectivePrice() so
     * cart and product detail show the same numbers.
     */
    protected function effectivePrice(Product $product, $variant = null): float
    {
        $base = (float) ($variant?->price ?? $product->price);

        if ($variant && (float) $variant->discount > 0 && $variant->discount_type) {
            $discount = (float) $variant->discount;
            $type = $variant->discount_type;
        } elseif ((float) ($product->discount ?? 0) > 0 && $product->discount_type) {
            $discount = (float) $product->discount;
            $type = $product->discount_type;
        } else {
            return $base;
        }

        $effective = match ($type) {
            'percent' => $base - ($base * $discount / 100),
            'flat' => $base - $discount,
            default => $base,
        };

        return max(0, $effective);
    }
}
