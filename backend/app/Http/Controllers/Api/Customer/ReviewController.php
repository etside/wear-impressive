<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\Reviews\StoreReviewRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductReview;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Customer Account
 */
class ReviewController extends Controller
{
    /**
     * POST /api/customer/reviews
     *
     * Creates a product review. If order_id is supplied and belongs to
     * the current customer, is_verified_purchase is set to true.
     * Reviews default to unapproved (is_approved=false) — vendor approves.
     */
    public function store(StoreReviewRequest $request): JsonResponse
    {
        $customer = $request->user('customer');
        abort_if(! $customer, 401, 'Unauthenticated.');

        $storeId = $this->currentStoreId($request);

        $data = $request->validated();

        // Customer must have a DELIVERED order containing this product to leave
        // a review. Find the most recent eligible order; if none, reject.
        $orderId = OrderItem::query()
            ->where('product_id', $data['product_id'])
            ->whereHas('order', function ($q) use ($customer, $storeId) {
                $q->where('store_id', $storeId)
                    ->where('customer_id', $customer->id)
                    ->where('status', 'delivered');
            })
            ->orderByDesc('id')
            ->value('order_id');

        if (! $orderId) {
            return ApiResponse::error('You can only review products from delivered orders.', 422);
        }

        // One review per customer per product.
        $alreadyReviewed = ProductReview::where('store_id', $storeId)
            ->where('product_id', $data['product_id'])
            ->where('customer_id', $customer->id)
            ->exists();
        if ($alreadyReviewed) {
            return ApiResponse::error('You have already reviewed this product.', 422);
        }

        $data['order_id'] = $orderId;
        $isVerified = true;

        $review = ProductReview::create([
            'store_id' => $storeId,
            'product_id' => $data['product_id'],
            'customer_id' => $customer->id,
            'order_id' => $data['order_id'] ?? null,
            'rating' => $data['rating'],
            'title' => $data['title'] ?? null,
            'content' => $data['content'] ?? null,
            'images' => $data['images'] ?? null,
            'is_verified_purchase' => $isVerified,
            'is_approved' => false,
            'approved_at' => null,
            'helpful_count' => 0,
        ]);

        return ApiResponse::success($review, 'Review submitted and pending approval.', 201);
    }

    /**
     * GET /api/customer/reviews/eligibility/{product}
     *
     * Returns whether the current customer is allowed to review the given
     * product. Eligible if they have a delivered order containing the
     * product AND haven't already submitted a review for it.
     *
     * Response shape:
     *   { eligible: bool, reason: string|null,
     *     existing_review: ProductReview|null, order_id: int|null }
     */
    public function eligibility(Request $request, Product $product): JsonResponse
    {
        $customer = $request->user('customer');
        if (! $customer) {
            return ApiResponse::success([
                'eligible' => false,
                'reason'   => 'sign_in_required',
                'existing_review' => null,
                'order_id' => null,
            ]);
        }

        $storeId = $this->currentStoreId($request);
        if ($product->store_id !== $storeId) {
            return ApiResponse::error('Product not found.', 404);
        }

        // Already reviewed?
        $existing = ProductReview::query()
            ->where('store_id', $storeId)
            ->where('product_id', $product->id)
            ->where('customer_id', $customer->id)
            ->first();

        if ($existing) {
            return ApiResponse::success([
                'eligible' => false,
                'reason'   => 'already_reviewed',
                'existing_review' => $existing,
                'order_id' => $existing->order_id,
            ]);
        }

        // Find a delivered order belonging to this customer that contained
        // this product (any variant).
        $orderId = OrderItem::query()
            ->where('product_id', $product->id)
            ->whereHas('order', function ($q) use ($customer, $storeId) {
                $q->where('store_id', $storeId)
                    ->where('customer_id', $customer->id)
                    ->where('status', 'delivered');
            })
            ->orderByDesc('id')
            ->value('order_id');

        if (! $orderId) {
            return ApiResponse::success([
                'eligible' => false,
                'reason'   => 'no_delivered_order',
                'existing_review' => null,
                'order_id' => null,
            ]);
        }

        return ApiResponse::success([
            'eligible' => true,
            'reason'   => null,
            'existing_review' => null,
            'order_id' => $orderId,
        ]);
    }
}
