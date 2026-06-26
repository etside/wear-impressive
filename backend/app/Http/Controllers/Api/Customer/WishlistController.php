<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Api\Storefront\CartController;
use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\Wishlist\StoreWishlistRequest;
use App\Http\Responses\ApiResponse;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\Wishlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * @group Customer Account
 */
class WishlistController extends Controller
{
    /**
     * GET /api/customer/wishlist
     */
    public function index(Request $request): JsonResponse
    {
        $customer = $this->requireCustomer($request);

        $items = Wishlist::query()
            ->where('customer_id', $customer->id)
            ->with(['product', 'variant'])
            ->latest('added_at')
            ->get();

        return ApiResponse::success($items);
    }

    /**
     * POST /api/customer/wishlist/add
     */
    public function store(StoreWishlistRequest $request): JsonResponse
    {
        $customer = $this->requireCustomer($request);

        $data = $request->validated();

        // Unique on (customer_id, product_id, variant_id) — just fetch or create.
        $item = Wishlist::firstOrCreate(
            [
                'customer_id' => $customer->id,
                'product_id' => $data['product_id'],
                'variant_id' => $data['variant_id'] ?? null,
            ],
            [
                'added_at' => Carbon::now(),
            ]
        );

        $item->load(['product', 'variant']);

        return ApiResponse::success($item, $item->wasRecentlyCreated ? 'Added to wishlist.' : 'Already in wishlist.', $item->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * DELETE /api/customer/wishlist/{wishlist}
     */
    public function destroy(Request $request, Wishlist $wishlist): JsonResponse
    {
        $this->authorizeOwnership($request, $wishlist);

        $wishlist->delete();

        return ApiResponse::success(null, 'Removed from wishlist.');
    }

    /**
     * DELETE /api/customer/wishlist/clear
     */
    public function clear(Request $request): JsonResponse
    {
        $customer = $this->requireCustomer($request);

        $deleted = Wishlist::where('customer_id', $customer->id)->delete();

        return ApiResponse::success([
            'deleted' => $deleted,
        ], 'Wishlist cleared.');
    }

    /**
     * POST /api/customer/wishlist/{wishlist}/move-to-cart
     *
     * Promote the wishlist item to a real cart line, then remove the
     * wishlist row. Returns the updated cart shape (same as CartController).
     */
    public function moveToCart(Request $request, Wishlist $wishlist): JsonResponse
    {
        $customer = $this->requireCustomer($request);
        abort_unless($wishlist->customer_id === $customer->id, 404, 'Wishlist item not found.');

        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $validated = $request->validate([
            'quantity' => ['nullable', 'integer', 'min:1'],
        ]);

        $quantity = (int) ($validated['quantity'] ?? 1);

        $product = Product::query()
            ->where('store_id', $store->id)
            ->where('id', $wishlist->product_id)
            ->where('status', 'active')
            ->first();

        if (! $product) {
            return ApiResponse::error('Product no longer available.', 404);
        }

        $variant = null;
        if ($wishlist->variant_id) {
            $variant = ProductVariant::query()
                ->where('product_id', $product->id)
                ->where('id', $wishlist->variant_id)
                ->where('is_active', true)
                ->first();

            if (! $variant) {
                return ApiResponse::error('Variant no longer available.', 404);
            }
        }

        if ($product->track_inventory) {
            $available = $variant ? (int) $variant->stock : (int) $product->stock;
            if ($available < $quantity) {
                return ApiResponse::error('Insufficient stock.', 422, [
                    'available' => $available,
                ]);
            }
        }

        $priceSnapshot = $variant?->price ?? $product->price;

        // Authenticated customer: use customer_id as the cart identity.
        DB::transaction(function () use ($wishlist, $customer, $store, $product, $variant, $quantity, $priceSnapshot) {
            $existing = CartItem::query()
                ->where('store_id', $store->id)
                ->where('customer_id', $customer->id)
                ->where('product_id', $product->id)
                ->when($variant, fn ($q) => $q->where('variant_id', $variant->id), fn ($q) => $q->whereNull('variant_id'))
                ->first();

            if ($existing) {
                $existing->quantity += $quantity;
                $existing->price_snapshot = $priceSnapshot;
                $existing->save();
            } else {
                CartItem::create([
                    'cart_token' => null,
                    'customer_id' => $customer->id,
                    'store_id' => $store->id,
                    'product_id' => $product->id,
                    'variant_id' => $variant?->id,
                    'quantity' => $quantity,
                    'price_snapshot' => $priceSnapshot,
                ]);
            }

            $wishlist->delete();
        });

        activity('wishlist')
            ->performedOn($product)
            ->causedBy($customer)
            ->withProperties([
                'product_id' => $product->id,
                'variant_id' => $variant?->id,
                'quantity' => $quantity,
            ])
            ->event('moved_to_cart')
            ->log('Wishlist item moved to cart');

        $cart = app(CartController::class)->payload($request, $store);

        return ApiResponse::success($cart, 'Item moved to cart.');
    }

    protected function requireCustomer(Request $request)
    {
        $customer = $request->user('customer');
        abort_if(! $customer, 401, 'Unauthenticated.');

        return $customer;
    }

    protected function authorizeOwnership(Request $request, Wishlist $wishlist): void
    {
        $customer = $this->requireCustomer($request);
        abort_unless($wishlist->customer_id === $customer->id, 404, 'Wishlist item not found.');
    }
}
