<?php

namespace App\Http\Requests\Vendor\Products;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $storeId = $this->storeId();
        $productId = $this->route('product')?->id ?? $this->route('product');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'short_description' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string'],

            // Vendor-defined extra tabs (see StoreProductRequest for shape).
            'custom_tabs' => ['nullable', 'array', 'max:10'],
            'custom_tabs.*.name_en' => ['required_with:custom_tabs.*', 'string', 'max:30'],
            'custom_tabs.*.name_bn' => ['nullable', 'string', 'max:30'],
            'custom_tabs.*.content_en' => ['nullable', 'string', 'max:50000'],
            'custom_tabs.*.content_bn' => ['nullable', 'string', 'max:50000'],

            'category_id' => [
                'sometimes',
                'required',
                Rule::exists('product_categories', 'id')->where(
                    fn ($q) => $q->where(function ($inner) use ($storeId) {
                        $inner->where('store_id', $storeId)->orWhereNull('store_id');
                    })
                ),
            ],
            'sub_category_id' => [
                'nullable',
                Rule::exists('product_categories', 'id')->where(
                    fn ($q) => $q->where(function ($inner) use ($storeId) {
                        $inner->where('store_id', $storeId)->orWhereNull('store_id');
                    })
                ),
            ],
            'brand_id' => [
                'nullable',
                Rule::exists('brands', 'id')->where(
                    fn ($q) => $q->where(function ($inner) use ($storeId) {
                        $inner->where('store_id', $storeId)->orWhereNull('store_id');
                    })
                ),
            ],

            'product_type' => ['sometimes', 'in:physical,digital,bundle'],
            'price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'discount_type' => ['nullable', 'in:flat,percent'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],

            // Bundle-specific fields (see StoreProductRequest for the shape).
            'bundle_pricing_strategy' => ['nullable', 'in:sum,fixed,percent'],
            'bundle_price' => ['nullable', 'numeric', 'min:0'],
            'bundle_discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'bundle_compare_at_price' => ['nullable', 'numeric', 'min:0'],
            'bundle_components' => ['nullable', 'array', 'min:1'],
            'bundle_components.*.component_product_id' => [
                'required_with:bundle_components',
                'integer',
                Rule::exists('products', 'id')->where(function ($q) use ($storeId, $productId) {
                    $q->where('store_id', $storeId)
                        ->where('product_type', '!=', 'bundle')
                        ->where('id', '!=', $productId);
                }),
            ],
            'bundle_components.*.quantity' => ['nullable', 'integer', 'min:1', 'max:50'],
            'bundle_components.*.sort_order' => ['nullable', 'integer'],
            'bundle_components.*.is_required' => ['sometimes', 'boolean'],

            'sku' => ['nullable', 'string', 'max:100', Rule::unique('products', 'sku')->ignore($productId)],
            'barcode' => ['nullable', 'string', 'max:100', Rule::unique('products', 'barcode')->ignore($productId)],

            'weight_value' => ['nullable', 'numeric', 'min:0'],
            'weight_unit' => ['nullable', 'in:g,kg,lb,oz'],

            'has_variants' => ['sometimes', 'boolean'],
            'track_inventory' => ['sometimes', 'boolean'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0'],

            'images' => ['nullable', 'array'],
            'images.*' => ['string'],
            'featured_image' => ['nullable', 'string'],
            'cover_image' => ['nullable', 'string'],

            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
            'url_handle' => ['nullable', 'string', 'max:255'],

            'status' => ['nullable', 'in:draft,active,archived'],

            'digital_file_path' => ['nullable', 'string'],
            'digital_file_name' => ['nullable', 'string'],
            'digital_file_size' => ['nullable', 'integer', 'min:0'],
            'download_limit' => ['nullable', 'integer', 'min:0'],
            'download_expiry_days' => ['nullable', 'integer', 'min:0'],
            'external_url' => ['nullable', 'string', 'max:500'],
            'video_url' => ['nullable', 'string', 'max:500'],
            'size_guide_url' => ['nullable', 'string', 'max:500'],

            'is_taxable' => ['sometimes', 'boolean'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],

            'variants' => ['nullable', 'array'],
            'variants.*.id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'variants.*.sku' => ['nullable', 'string', 'max:100'],
            'variants.*.barcode' => ['nullable', 'string', 'max:100'],
            'variants.*.options' => ['required_with:variants', 'array'],
            'variants.*.price' => ['required_with:variants', 'numeric', 'min:0'],
            'variants.*.discount' => ['nullable', 'numeric', 'min:0'],
            'variants.*.discount_type' => ['nullable', 'in:flat,percent'],
            'variants.*.cost_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.stock' => ['nullable', 'integer', 'min:0'],
            'variants.*.image' => ['nullable', 'string'],
            'variants.*.sort_order' => ['nullable', 'integer'],
            'variants.*.is_active' => ['sometimes', 'boolean'],
        ];
    }

    protected function storeId(): ?int
    {
        $store = $this->attributes->get('store') ?? ($this->store ?? null);

        return $store?->id;
    }
}
