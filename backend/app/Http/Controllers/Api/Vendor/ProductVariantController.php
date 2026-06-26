<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Vendor\Products\StoreVariantRequest;
use App\Http\Requests\Vendor\Products\UpdateVariantRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Vendor Dashboard
 */
class ProductVariantController extends Controller
{
    /**
     * POST /api/vendor/products/{product}/variants
     */
    public function store(StoreVariantRequest $request, int $productId): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $product = Product::where('store_id', $storeId)->find($productId);

        if (! $product) {
            return ApiResponse::error('Product not found.', 404);
        }

        $data = $request->validated();
        $data['is_active'] = $data['is_active'] ?? true;
        $data['stock'] = $data['stock'] ?? 0;

        $variant = $product->variants()->create($data);

        // Ensure parent is flagged as having variants
        if (! $product->has_variants) {
            $product->update(['has_variants' => true]);
        }

        return ApiResponse::success($variant, 'Variant created.', 201);
    }

    /**
     * PUT /api/vendor/products/{product}/variants/{variant}
     */
    public function update(UpdateVariantRequest $request, int $productId, int $variantId): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $product = Product::where('store_id', $storeId)->find($productId);

        if (! $product) {
            return ApiResponse::error('Product not found.', 404);
        }

        $variant = ProductVariant::where('product_id', $product->id)->find($variantId);

        if (! $variant) {
            return ApiResponse::error('Variant not found on this product.', 404);
        }

        $variant->update($request->validated());

        return ApiResponse::success($variant->fresh(), 'Variant updated.');
    }

    /**
     * DELETE /api/vendor/products/{product}/variants/{variant}
     */
    public function destroy(Request $request, int $productId, int $variantId): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $product = Product::where('store_id', $storeId)->find($productId);

        if (! $product) {
            return ApiResponse::error('Product not found.', 404);
        }

        $variant = ProductVariant::where('product_id', $product->id)->find($variantId);

        if (! $variant) {
            return ApiResponse::error('Variant not found on this product.', 404);
        }

        $variant->delete();

        // If no variants remain, unflag the product
        if ($product->variants()->count() === 0) {
            $product->update(['has_variants' => false]);
        }

        return ApiResponse::success(null, 'Variant deleted.');
    }
}
