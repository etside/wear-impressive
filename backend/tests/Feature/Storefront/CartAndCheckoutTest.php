<?php

namespace Tests\Feature\Storefront;

use App\Events\OrderPlaced;
use App\Models\Product;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Tests\Helpers\CreatesStores;
use Tests\TestCase;

class CartAndCheckoutTest extends TestCase
{
    use CreatesStores;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    public function test_cart_add_update_remove_and_guest_checkout_cod(): void
    {
        Event::fake([OrderPlaced::class]);

        $store = $this->createStore();
        $vendor = Vendor::factory()->create(['store_id' => $store->id]);
        $product = $this->createProduct($store, $vendor, ['price' => 500, 'stock' => 20]);

        $headers = $this->withStoreHandle($store, [
            'X-Cart-Token' => 'guest-cart-123',
        ]);

        // Add item.
        $add = $this->postJson('/api/store/cart/items', [
            'product_id' => $product->id,
            'quantity' => 2,
        ], $headers);

        $add->assertStatus(200)
            ->assertJsonPath('data.totals.subtotal', 1000);

        $itemId = $add->json('data.items.0.id');
        $this->assertNotNull($itemId);

        // Update qty.
        $update = $this->patchJson('/api/store/cart/items/'.$itemId, [
            'quantity' => 3,
        ], $headers);

        $update->assertStatus(200)
            ->assertJsonPath('data.totals.subtotal', 1500);

        // Remove.
        $remove = $this->deleteJson('/api/store/cart/items/'.$itemId, [], $headers);
        $remove->assertStatus(200)
            ->assertJsonPath('data.totals.subtotal', 0);

        // Re-add for checkout.
        $this->postJson('/api/store/cart/items', [
            'product_id' => $product->id,
            'quantity' => 1,
        ], $headers)->assertStatus(200);

        // Place COD order.
        $place = $this->postJson('/api/store/checkout/place', [
            'name' => 'Guest Buyer',
            'email' => 'g@example.com',
            'phone' => '01700000000',
            'shipping_address' => [
                'full_name' => 'Guest Buyer',
                'phone' => '01700000000',
                'address_line_1' => '123 Test Road',
                'district' => 'Dhaka',
                'thana' => 'Gulshan',
            ],
            'payment_method' => 'cod',
            'cart_token' => 'guest-cart-123',
        ], $headers);

        $place->assertStatus(201)
            ->assertJsonPath('data.requires_payment', false)
            ->assertJsonPath('data.payment_method', 'cod');

        $this->assertDatabaseHas('orders', [
            'store_id' => $store->id,
            'order_number' => $place->json('data.order_number'),
            'payment_method' => 'cod',
        ]);

        Event::assertDispatched(OrderPlaced::class);
    }

    public function test_online_gateway_checkout_signals_requires_payment(): void
    {
        $store = $this->createStore();
        $vendor = Vendor::factory()->create(['store_id' => $store->id]);
        $product = $this->createProduct($store, $vendor, ['price' => 1200, 'stock' => 5]);

        $headers = $this->withStoreHandle($store, [
            'X-Cart-Token' => 'guest-cart-456',
        ]);

        // Add to cart.
        $this->postJson('/api/store/cart/items', [
            'product_id' => $product->id,
            'quantity' => 1,
        ], $headers)->assertStatus(200);

        $place = $this->postJson('/api/store/checkout/place', [
            'name' => 'Buyer',
            'email' => 'b@example.com',
            'phone' => '01700000001',
            'shipping_address' => [
                'full_name' => 'Buyer',
                'phone' => '01700000001',
                'address_line_1' => 'Test',
                'district' => 'Dhaka',
                'thana' => 'Gulshan',
            ],
            'payment_method' => 'sslcommerz',
            'cart_token' => 'guest-cart-456',
        ], $headers);

        $place->assertStatus(201)
            ->assertJsonPath('data.requires_payment', true)
            ->assertJsonPath('data.payment_method', 'sslcommerz');
    }
}
