<?php

namespace Tests\Feature\Storefront;

use App\Models\Product;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Helpers\CreatesStores;
use Tests\TestCase;

class ProductListTest extends TestCase
{
    use CreatesStores;
    use RefreshDatabase;

    public function test_storefront_lists_active_products_with_pagination(): void
    {
        $store = $this->createStore();
        $vendor = Vendor::factory()->create(['store_id' => $store->id]);
        $category = $this->createCategory($store);

        Product::factory()->count(3)->create([
            'store_id' => $store->id,
            'vendor_id' => $vendor->id,
            'category_id' => $category->id,
        ]);

        // Draft product should NOT show.
        Product::factory()->draft()->create([
            'store_id' => $store->id,
            'vendor_id' => $vendor->id,
            'category_id' => $category->id,
        ]);

        $response = $this->getJson('/api/store/products', $this->withStoreHandle($store));

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => ['data', 'current_page', 'per_page', 'total'],
            ])
            ->assertJsonPath('data.total', 3);
    }

    public function test_category_filter_scopes_products(): void
    {
        $store = $this->createStore();
        $vendor = Vendor::factory()->create(['store_id' => $store->id]);
        $catA = $this->createCategory($store, ['name' => 'Cat A', 'slug' => 'cat-a']);
        $catB = $this->createCategory($store, ['name' => 'Cat B', 'slug' => 'cat-b']);

        Product::factory()->count(2)->create([
            'store_id' => $store->id,
            'vendor_id' => $vendor->id,
            'category_id' => $catA->id,
        ]);
        Product::factory()->count(3)->create([
            'store_id' => $store->id,
            'vendor_id' => $vendor->id,
            'category_id' => $catB->id,
        ]);

        $response = $this->getJson('/api/store/products?category_id='.$catB->id, $this->withStoreHandle($store));

        $response->assertStatus(200)
            ->assertJsonPath('data.total', 3);
    }

    public function test_product_detail_by_slug(): void
    {
        $store = $this->createStore();
        $vendor = Vendor::factory()->create(['store_id' => $store->id]);
        $category = $this->createCategory($store);

        $product = Product::factory()->create([
            'store_id' => $store->id,
            'vendor_id' => $vendor->id,
            'category_id' => $category->id,
            'slug' => 'my-nice-product',
        ]);

        $response = $this->getJson('/api/store/products/my-nice-product', $this->withStoreHandle($store));

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $product->id)
            ->assertJsonPath('data.slug', 'my-nice-product');
    }
}
