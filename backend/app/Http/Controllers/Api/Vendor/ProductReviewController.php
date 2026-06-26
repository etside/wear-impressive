<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Vendor\Reviews\ReplyReviewRequest;
use App\Http\Responses\ApiResponse;
use App\Models\ProductReview;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * @group Vendor Dashboard
 */
class ProductReviewController extends Controller
{
    /**
     * GET /api/vendor/reviews
     *
     * Filters: product_id, is_approved, rating, date_from, date_to
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $request->validate([
            'product_id' => ['nullable', 'integer'],
            'is_approved' => ['nullable', 'boolean'],
            'rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $query = ProductReview::query()
            ->where('store_id', $storeId)
            ->with(['product', 'customer']);

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->integer('product_id'));
        }

        if ($request->filled('is_approved')) {
            $query->where('is_approved', $request->boolean('is_approved'));
        }

        if ($request->filled('rating')) {
            $query->where('rating', $request->integer('rating'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        $reviews = $query->latest()->paginate($request->input('per_page', 25));

        return ApiResponse::success($reviews);
    }

    /**
     * GET /api/vendor/reviews/{review}
     */
    public function show(Request $request, ProductReview $review): JsonResponse
    {
        $this->authorizeStoreAccess($request, $review);

        $review->load(['product', 'customer', 'order']);

        return ApiResponse::success($review);
    }

    /**
     * GET /api/vendor/reviews/stats
     */
    public function stats(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $base = ProductReview::query()->where('store_id', $storeId);

        $total = (clone $base)->count();
        $approved = (clone $base)->where('is_approved', true)->count();
        $pending = (clone $base)->where('is_approved', false)->count();
        $avg = (clone $base)->avg('rating');

        $byRating = [];
        for ($r = 1; $r <= 5; $r++) {
            $byRating[$r] = (clone $base)->where('rating', $r)->count();
        }

        return ApiResponse::success([
            'total' => $total,
            'approved' => $approved,
            'pending' => $pending,
            'average' => $avg ? round((float) $avg, 2) : 0,
            'by_rating' => $byRating,
        ]);
    }

    /**
     * POST /api/vendor/reviews/{review}/approve
     */
    public function approve(Request $request, ProductReview $review): JsonResponse
    {
        $this->authorizeStoreAccess($request, $review);

        $review->update([
            'is_approved' => true,
            'approved_at' => Carbon::now(),
        ]);

        return ApiResponse::success($review, 'Review approved.');
    }

    /**
     * POST /api/vendor/reviews/{review}/reject (soft delete)
     */
    public function reject(Request $request, ProductReview $review): JsonResponse
    {
        $this->authorizeStoreAccess($request, $review);

        $review->update([
            'is_approved' => false,
            'approved_at' => null,
        ]);
        $review->delete();

        return ApiResponse::success(null, 'Review rejected.');
    }

    /**
     * POST /api/vendor/reviews/{review}/reply
     */
    public function reply(ReplyReviewRequest $request, ProductReview $review): JsonResponse
    {
        $this->authorizeStoreAccess($request, $review);

        $review->update([
            'reply_text' => $request->input('reply_text'),
            'reply_at' => Carbon::now(),
        ]);

        return ApiResponse::success($review, 'Reply saved.');
    }

    protected function authorizeStoreAccess(Request $request, ProductReview $review): void
    {
        $storeId = $this->currentStoreId($request);
        abort_unless($review->store_id === $storeId, 404, 'Review not found.');
    }
}
