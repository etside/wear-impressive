<?php

namespace Tests\Helpers;

use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Store;
use App\Models\SuperAdmin;
use App\Models\Vendor;
use Illuminate\Support\Str;

/**
 * Shared test helpers for creating multi-tenant fixtures and auth shortcuts.
 */
trait CreatesStores
{
    /**
     * Create a Store directly (bypassing the registration flow).
     */
    protected function createStore(array $overrides = []): Store
    {
        $handle = $overrides['handle'] ?? 'store-'.Str::lower(Str::random(8));

        return Store::factory()->create(array_merge([
            'handle' => $handle,
        ], $overrides));
    }

    /**
     * Create a vendor for a given store and return [Vendor, token].
     *
     * @return array{0: \App\Models\Vendor, 1: string}
     */
    protected function actingAsVendor(Store $store, array $overrides = []): array
    {
        $vendor = Vendor::factory()->create(array_merge([
            'store_id' => $store->id,
        ], $overrides));

        $token = $vendor->createToken('test')->plainTextToken;

        return [$vendor, $token];
    }

    /**
     * Create a customer on the given store and return [Customer, token].
     *
     * @return array{0: \App\Models\Customer, 1: string}
     */
    protected function actingAsCustomer(Store $store, array $overrides = []): array
    {
        $customer = Customer::factory()->create(array_merge([
            'store_id' => $store->id,
        ], $overrides));

        $token = $customer->createToken('test')->plainTextToken;

        return [$customer, $token];
    }

    /**
     * Create a super admin and return [SuperAdmin, token].
     *
     * @return array{0: \App\Models\SuperAdmin, 1: string}
     */
    protected function actingAsSuperAdmin(array $overrides = []): array
    {
        $admin = SuperAdmin::factory()->create($overrides);
        $token = $admin->createToken('test')->plainTextToken;

        return [$admin, $token];
    }

    /**
     * Return request headers carrying the store handle.
     */
    protected function withStoreHandle(Store $store, array $extra = []): array
    {
        return array_merge([
            'X-Store-Handle' => $store->handle,
            'Accept' => 'application/json',
        ], $extra);
    }

    /**
     * Auth header for sanctum bearer token.
     */
    protected function bearer(string $token, array $extra = []): array
    {
        return array_merge([
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ], $extra);
    }

    /**
     * Create a category scoped to a store. Useful so products can be created.
     */
    protected function createCategory(Store $store, array $overrides = []): ProductCategory
    {
        return ProductCategory::create(array_merge([
            'store_id' => $store->id,
            'name' => 'General',
            'slug' => 'general-'.Str::lower(Str::random(6)),
            'is_active' => true,
        ], $overrides));
    }

    /**
     * Create an active product belonging to a store (and its vendor).
     */
    protected function createProduct(Store $store, Vendor $vendor, array $overrides = []): Product
    {
        $category = isset($overrides['category_id'])
            ? ProductCategory::find($overrides['category_id'])
            : $this->createCategory($store);

        return Product::factory()->create(array_merge([
            'store_id' => $store->id,
            'vendor_id' => $vendor->id,
            'category_id' => $category->id,
        ], $overrides));
    }
}
