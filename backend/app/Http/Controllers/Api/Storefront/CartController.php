<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\CartCoupon;
use App\Models\CartItem;
use App\Models\Discount;
use App\Models\Product;
use App\Models\ProductBundleComponent;
use App\Models\ProductVariant;
use App\Models\Store;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Storefront (Public)
 */
class CartController extends Controller
{
    /**
     * GET /api/store/cart
     */
    public function show(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        return ApiResponse::success($this->buildCartPayload($request, $store), 'Cart loaded.');
    }

    /**
     * POST /api/store/cart/items
     */
    public function add(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $validated = $request->validate([
            'product_id' => ['required', 'integer'],
            'variant_id' => ['nullable', 'integer'],
            'quantity' => ['nullable', 'integer', 'min:1'],
            // Bundle add: customer's variant pick per component.
            'components' => ['nullable', 'array'],
            'components.*.component_product_id' => ['required_with:components', 'integer'],
            'components.*.variant_id' => ['nullable', 'integer'],
        ]);

        $quantity = (int) ($validated['quantity'] ?? 1);

        $product = Product::query()
            ->where('store_id', $store->id)
            ->where('status', 'active')
            ->find($validated['product_id']);

        if (! $product) {
            return ApiResponse::error('Product not available.', 404);
        }

        // Bundle path — different shape, separate code path. Returns
        // early because bundles never share rows with simple products.
        if ($product->isBundle()) {
            return $this->addBundle($request, $store, $product, $quantity, $validated['components'] ?? []);
        }

        $variant = null;
        if (! empty($validated['variant_id'])) {
            $variant = ProductVariant::query()
                ->where('product_id', $product->id)
                ->where('is_active', true)
                ->find($validated['variant_id']);

            if (! $variant) {
                return ApiResponse::error('Variant not available.', 404);
            }
        }

        $priceSnapshot = $this->effectivePrice($product, $variant);

        [$cartToken, $customerId] = $this->cartIdentity($request);

        $existing = CartItem::query()
            ->where('store_id', $store->id)
            ->where('product_id', $product->id)
            ->whereNull('parent_cart_item_id')
            ->when($variant, fn ($q) => $q->where('variant_id', $variant->id), fn ($q) => $q->whereNull('variant_id'))
            ->when($customerId, fn ($q) => $q->where('customer_id', $customerId))
            ->when(! $customerId && $cartToken, fn ($q) => $q->where('cart_token', $cartToken)->whereNull('customer_id'))
            ->first();

        // Stock check against the line's FINAL quantity (existing + new),
        // not just the new amount — otherwise repeated adds can push a
        // line past stock one small increment at a time.
        if ($product->track_inventory) {
            $available = $variant ? (int) $variant->stock : (int) $product->stock;
            $finalQuantity = ($existing?->quantity ?? 0) + $quantity;
            if ($available < $finalQuantity) {
                return ApiResponse::error('Insufficient stock.', 422, [
                    'available' => $available,
                ]);
            }
        }

        if ($existing) {
            $existing->quantity += $quantity;
            $existing->price_snapshot = $priceSnapshot;
            $existing->save();
        } else {
            CartItem::create([
                'cart_token' => $customerId ? null : $cartToken,
                'customer_id' => $customerId,
                'store_id' => $store->id,
                'product_id' => $product->id,
                'variant_id' => $variant?->id,
                'quantity' => $quantity,
                'price_snapshot' => $priceSnapshot,
            ]);
        }

        return ApiResponse::success($this->buildCartPayload($request, $store), 'Item added to cart.');
    }

    /**
     * Add a bundle product to the cart. Validates that every required
     * component has a chosen, in-stock variant, then writes a parent row
     * (bundle product, no variant) plus one child row per component
     * (component product + chosen variant) all in a single transaction.
     */
    protected function addBundle(Request $request, Store $store, Product $bundle, int $quantity, array $components): JsonResponse
    {
        $bundle->load('bundleComponents.component');

        // Index the requested components by component_product_id for fast lookup.
        $picksByComponent = [];
        foreach ($components as $c) {
            $picksByComponent[(int) $c['component_product_id']] = $c['variant_id'] ?? null;
        }

        // Resolve each defined bundle component + the variant the customer picked.
        $resolved = []; // [['bc' => ProductBundleComponent, 'product' => Product, 'variant' => ?ProductVariant], ...]

        foreach ($bundle->bundleComponents as $bc) {
            $componentProduct = $bc->component;
            if (! $componentProduct || $componentProduct->status !== 'active') {
                return ApiResponse::error("Component '{$bc->component_product_id}' is no longer available.", 422);
            }

            $variantId = $picksByComponent[$bc->component_product_id] ?? null;
            $variant = null;

            if ($componentProduct->has_variants) {
                if ($bc->is_required && ! $variantId) {
                    return ApiResponse::error("Pick a variant for {$componentProduct->name}.", 422);
                }
                if ($variantId) {
                    $variant = ProductVariant::query()
                        ->where('product_id', $componentProduct->id)
                        ->where('is_active', true)
                        ->find($variantId);
                    if (! $variant) {
                        return ApiResponse::error("Selected variant for {$componentProduct->name} is not available.", 422);
                    }
                }
            }

            // Stock check per component: needed = bundle qty × component qty in bundle.
            $needed = $quantity * (int) $bc->quantity;
            if ($componentProduct->track_inventory) {
                $available = $variant ? (int) $variant->stock : (int) $componentProduct->stock;
                if ($available < $needed) {
                    return ApiResponse::error(
                        "Not enough stock for {$componentProduct->name}. Available: {$available}, needed: {$needed}.",
                        422,
                        ['component_product_id' => $componentProduct->id, 'available' => $available, 'needed' => $needed]
                    );
                }
            }

            $resolved[] = [
                'bc' => $bc,
                'product' => $componentProduct,
                'variant' => $variant,
            ];
        }

        // Compute the bundle-level price snapshot. For 'sum' strategy we
        // sum the customer's actual picks (variant-aware); for fixed/percent
        // we use the configured strategy.
        $strategy = $bundle->bundle_pricing_strategy ?? 'sum';
        $sumOfPicks = 0.0;
        foreach ($resolved as $r) {
            $sumOfPicks += $this->effectivePrice($r['product'], $r['variant']) * (int) $r['bc']->quantity;
        }

        $bundleUnitPrice = match ($strategy) {
            'fixed' => (float) ($bundle->bundle_price ?? 0),
            'percent' => round($sumOfPicks * (1 - ((float) $bundle->bundle_discount_percent / 100)), 2),
            default => $sumOfPicks, // 'sum'
        };

        [$cartToken, $customerId] = $this->cartIdentity($request);

        DB::transaction(function () use ($store, $bundle, $quantity, $bundleUnitPrice, $resolved, $cartToken, $customerId) {
            // Always create a fresh parent row per add. Merging two
            // bundle adds requires comparing every component pick — easier
            // to just keep them as separate cart lines.
            $parent = CartItem::create([
                'cart_token' => $customerId ? null : $cartToken,
                'customer_id' => $customerId,
                'store_id' => $store->id,
                'product_id' => $bundle->id,
                'variant_id' => null,
                'parent_cart_item_id' => null,
                'quantity' => $quantity,
                'price_snapshot' => $bundleUnitPrice,
            ]);

            foreach ($resolved as $r) {
                CartItem::create([
                    'cart_token' => $customerId ? null : $cartToken,
                    'customer_id' => $customerId,
                    'store_id' => $store->id,
                    'product_id' => $r['product']->id,
                    'variant_id' => $r['variant']?->id,
                    'parent_cart_item_id' => $parent->id,
                    'quantity' => $quantity * (int) $r['bc']->quantity,
                    // Children carry zero so the cart total isn't double-counted.
                    'price_snapshot' => 0,
                ]);
            }
        });

        return ApiResponse::success($this->buildCartPayload($request, $store), 'Bundle added to cart.');
    }

    /**
     * PATCH /api/store/cart/items/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $validated = $request->validate([
            'quantity' => ['sometimes', 'integer', 'min:1'],
            // `variant_id` is sent when the customer swaps the variant from
            // the cart page directly (without going back to the product
            // detail page). Pass null to clear, or a different variant id to
            // switch — must belong to the same product as the cart item.
            'variant_id' => ['sometimes', 'nullable', 'integer'],
        ]);

        $item = $this->findCartItem($request, $store, $id);

        if (! $item) {
            return ApiResponse::error('Cart item not found.', 404);
        }

        if (array_key_exists('variant_id', $validated)) {
            $newVariantId = $validated['variant_id'] ?: null;
            if ($newVariantId !== $item->variant_id) {
                if ($newVariantId === null) {
                    $item->variant_id = null;
                } else {
                    $variant = \App\Models\ProductVariant::query()
                        ->where('product_id', $item->product_id)
                        ->where('is_active', true)
                        ->find($newVariantId);
                    if (! $variant) {
                        return ApiResponse::error('Selected variant is not available.', 422);
                    }
                    $item->variant_id = $variant->id;
                    // Re-price the line so the cart total reflects any
                    // variant-specific price differences (and discounts).
                    $item->loadMissing('product');
                    $item->price_snapshot = $this->effectivePrice($item->product, $variant);
                }
            }
        }

        if (isset($validated['quantity'])) {
            $newQuantity = (int) $validated['quantity'];

            $item->loadMissing('product', 'variant');
            $product = $item->product;
            if ($product && $product->track_inventory) {
                $available = $item->variant ? (int) $item->variant->stock : (int) $product->stock;
                if ($available < $newQuantity) {
                    return ApiResponse::error('Insufficient stock.', 422, [
                        'available' => $available,
                    ]);
                }
            }

            $item->quantity = $newQuantity;
        }

        $item->save();

        return ApiResponse::success($this->buildCartPayload($request, $store), 'Cart item updated.');
    }

    /**
     * DELETE /api/store/cart/items/{id}
     */
    public function remove(Request $request, int $id): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $item = $this->findCartItem($request, $store, $id);

        if (! $item) {
            return ApiResponse::error('Cart item not found.', 404);
        }

        $item->delete();

        return ApiResponse::success($this->buildCartPayload($request, $store), 'Cart item removed.');
    }

    /**
     * DELETE /api/store/cart/clear
     */
    public function clear(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        [$cartToken, $customerId] = $this->cartIdentity($request);

        CartItem::query()
            ->where('store_id', $store->id)
            ->when($customerId, fn ($q) => $q->where('customer_id', $customerId))
            ->when(! $customerId && $cartToken, fn ($q) => $q->where('cart_token', $cartToken)->whereNull('customer_id'))
            ->delete();

        CartCoupon::query()
            ->where('store_id', $store->id)
            ->when($customerId, fn ($q) => $q->where('customer_id', $customerId))
            ->when(! $customerId && $cartToken, fn ($q) => $q->where('cart_token', $cartToken)->whereNull('customer_id'))
            ->delete();

        return ApiResponse::success($this->buildCartPayload($request, $store), 'Cart cleared.');
    }

    /**
     * POST /api/store/cart/apply-coupon
     */
    public function applyCoupon(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $validated = $request->validate([
            'code' => ['required', 'string'],
        ]);

        $code = trim((string) $validated['code']);

        $discount = Discount::query()
            ->where('store_id', $store->id)
            ->where('code', $code)
            ->where('is_active', true)
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->first();

        if (! $discount) {
            return ApiResponse::error('Invalid or expired coupon.', 422);
        }

        if ($discount->usage_limit !== null && $discount->used_count >= $discount->usage_limit) {
            return ApiResponse::error('Coupon usage limit reached.', 422);
        }

        [$cartToken, $customerId] = $this->cartIdentity($request);

        // Remove any existing coupon, then apply new.
        CartCoupon::query()
            ->where('store_id', $store->id)
            ->when($customerId, fn ($q) => $q->where('customer_id', $customerId))
            ->when(! $customerId && $cartToken, fn ($q) => $q->where('cart_token', $cartToken)->whereNull('customer_id'))
            ->delete();

        CartCoupon::create([
            'cart_token' => $customerId ? null : $cartToken,
            'customer_id' => $customerId,
            'store_id' => $store->id,
            'code' => $code,
        ]);

        return ApiResponse::success($this->buildCartPayload($request, $store), 'Coupon applied.');
    }

    /**
     * DELETE /api/store/cart/coupon
     */
    public function removeCoupon(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        [$cartToken, $customerId] = $this->cartIdentity($request);

        CartCoupon::query()
            ->where('store_id', $store->id)
            ->when($customerId, fn ($q) => $q->where('customer_id', $customerId))
            ->when(! $customerId && $cartToken, fn ($q) => $q->where('cart_token', $cartToken)->whereNull('customer_id'))
            ->delete();

        return ApiResponse::success($this->buildCartPayload($request, $store), 'Coupon removed.');
    }

    /**
     * Resolve the cart identity — [cart_token, customer_id].
     *
     * Logged-in customers use their customer_id. Guests use the cart_token.
     */
    protected function cartIdentity(Request $request): array
    {
        $customerId = auth('customer')->id();

        if ($customerId) {
            return [null, (int) $customerId];
        }

        $token = $request->header('X-Cart-Token')
            ?? $request->query('cart_token')
            ?? $request->input('cart_token');

        return [$token ? (string) $token : null, null];
    }

    protected function findCartItem(Request $request, Store $store, int $id): ?CartItem
    {
        [$cartToken, $customerId] = $this->cartIdentity($request);

        return CartItem::query()
            ->where('id', $id)
            ->where('store_id', $store->id)
            ->when($customerId, fn ($q) => $q->where('customer_id', $customerId))
            ->when(! $customerId && $cartToken, fn ($q) => $q->where('cart_token', $cartToken)->whereNull('customer_id'))
            ->first();
    }

    /**
     * Public accessor so other controllers can build an identical cart payload.
     */
    public function payload(Request $request, Store $store): array
    {
        return $this->buildCartPayload($request, $store);
    }

    /**
     * Build the cart response payload.
     */
    protected function buildCartPayload(Request $request, Store $store): array
    {
        [$cartToken, $customerId] = $this->cartIdentity($request);

        // Pull only the root-level cart rows (no parent). Each root row's
        // children are eager-loaded so a bundle parent can render its
        // chosen-variant components inline.
        $items = CartItem::query()
            ->where('store_id', $store->id)
            ->whereNull('parent_cart_item_id')
            ->when($customerId, fn ($q) => $q->where('customer_id', $customerId))
            ->when(! $customerId && $cartToken, fn ($q) => $q->where('cart_token', $cartToken)->whereNull('customer_id'))
            ->with([
                'product' => fn ($q) => $q->with(['productImages' => fn ($qq) => $qq->orderBy('position')]),
                'variant',
                'children' => fn ($q) => $q->with([
                    'product' => fn ($qq) => $qq->with(['productImages' => fn ($qqq) => $qqq->orderBy('position')]),
                    'variant',
                ])->orderBy('id'),
            ])
            ->orderBy('id')
            ->get();

        $shapeChild = function (CartItem $child) {
            $cp = $child->product;
            $cv = $child->variant;

            return [
                'id' => $child->id,
                'product_id' => $child->product_id,
                'variant_id' => $child->variant_id,
                'quantity' => (int) $child->quantity,
                'product' => $cp ? [
                    'id' => $cp->id,
                    'name' => $cp->name,
                    'slug' => $cp->slug,
                    'featured_image' => $cp->featured_image,
                ] : null,
                'variant' => $cv ? [
                    'id' => $cv->id,
                    'sku' => $cv->sku,
                    'options' => $cv->options,
                    'image' => $cv->image,
                ] : null,
            ];
        };

        $transformedItems = $items->map(function (CartItem $item) use ($shapeChild) {
            $product = $item->product;
            $variant = $item->variant;
            $isBundle = $product && $product->isBundle();

            // Bundles: trust the snapshot. The customer's variant picks
            // are baked into it at add-time and shouldn't auto-recompute on
            // every page load (variant changes don't propagate). For
            // simple products: keep the existing live-recompute behavior.
            $price = $isBundle
                ? (float) $item->price_snapshot
                : ($product ? $this->effectivePrice($product, $variant) : (float) $item->price_snapshot);
            $lineTotal = $price * (int) $item->quantity;

            $children = $isBundle && $item->relationLoaded('children')
                ? $item->children->map($shapeChild)->values()->all()
                : [];

            return [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'variant_id' => $item->variant_id,
                'quantity' => (int) $item->quantity,
                'price' => $price,
                'price_snapshot' => (float) $item->price_snapshot,
                'line_total' => $lineTotal,
                'is_bundle' => $isBundle,
                'product' => $product ? [
                    'id' => $product->id,
                    'name' => $product->name,
                    'slug' => $product->slug,
                    'product_type' => $product->product_type,
                    'featured_image' => $product->featured_image,
                    'images' => $product->productImages?->pluck('url'),
                    'track_inventory' => (bool) $product->track_inventory,
                    'stock' => (int) $product->stock,
                ] : null,
                'variant' => $variant ? [
                    'id' => $variant->id,
                    'sku' => $variant->sku,
                    'options' => $variant->options,
                    'image' => $variant->image,
                    'stock' => (int) $variant->stock,
                ] : null,
                'components' => $children,
            ];
        });

        $subtotal = $transformedItems->sum('line_total');

        // Coupon / discount calculation.
        $coupon = CartCoupon::query()
            ->where('store_id', $store->id)
            ->when($customerId, fn ($q) => $q->where('customer_id', $customerId))
            ->when(! $customerId && $cartToken, fn ($q) => $q->where('cart_token', $cartToken)->whereNull('customer_id'))
            ->first();

        $discount = 0.0;
        $couponPayload = null;

        if ($coupon) {
            $record = Discount::query()
                ->where('store_id', $store->id)
                ->where('code', $coupon->code)
                ->where('is_active', true)
                ->first();

            if ($record) {
                $discount = $this->calculateDiscount($record, (float) $subtotal);
                $couponPayload = [
                    'code' => $record->code,
                    'name' => $record->name,
                    'type' => $record->type,
                    'value' => (float) $record->value,
                    'discount_amount' => $discount,
                ];
            }
        }

        return [
            'cart_token' => $customerId ? null : $cartToken,
            'customer_id' => $customerId,
            'items' => $transformedItems,
            'coupon' => $couponPayload,
            'totals' => [
                'subtotal' => round((float) $subtotal, 2),
                'discount' => round($discount, 2),
                'shipping_estimate' => 0.0,
                'tax' => 0.0,
                'total' => round(max(0, (float) $subtotal - $discount), 2),
            ],
        ];
    }

    protected function calculateDiscount(Discount $discount, float $subtotal): float
    {
        if ($discount->minimum_amount && $subtotal < (float) $discount->minimum_amount) {
            return 0.0;
        }

        $amount = match ($discount->type) {
            'percentage' => $subtotal * ((float) $discount->value / 100),
            'fixed' => (float) $discount->value,
            default => 0.0,
        };

        if ($discount->maximum_discount !== null) {
            $amount = min($amount, (float) $discount->maximum_discount);
        }

        return round(min($amount, $subtotal), 2);
    }

    /**
     * Compute the effective unit price after applying any product- or
     * variant-level discount. Variant-specific discount fields take
     * precedence over the product's only when the variant has BOTH a
     * non-zero `discount` value and a `discount_type` set.
     *
     * Mirrors the storefront's client-side `discountedPrice()` helper at
     * frontend/app/(storefront)/products/[id]/product-client.tsx so the
     * server-side cart line total matches what the customer sees on the
     * product page.
     */
    protected function effectivePrice(Product $product, ?ProductVariant $variant): float
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
