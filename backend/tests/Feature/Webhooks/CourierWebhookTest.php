<?php

namespace Tests\Feature\Webhooks;

use App\Models\Order;
use App\Models\OrderFulfillment;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Helpers\CreatesStores;
use Tests\TestCase;

class CourierWebhookTest extends TestCase
{
    use CreatesStores;
    use RefreshDatabase;

    public function test_pathao_webhook_transitions_fulfillment_to_delivered(): void
    {
        $store = $this->createStore();
        Vendor::factory()->create(['store_id' => $store->id]);
        $order = Order::factory()->create(['store_id' => $store->id, 'status' => 'shipped']);

        $fulfillment = OrderFulfillment::create([
            'order_id' => $order->id,
            'carrier' => 'pathao',
            'tracking_number' => 'PTH-12345',
            'status' => 'shipped',
            'shipped_at' => now(),
        ]);

        $response = $this->post('/api/webhooks/couriers/pathao', [
            'consignment_id' => 'PTH-12345',
            'order_status' => 'Delivered',
        ], ['Accept' => 'application/json']);

        $response->assertStatus(200);

        $fulfillment->refresh();
        $this->assertSame('delivered', $fulfillment->status);
        $this->assertNotNull($fulfillment->delivered_at);

        $order->refresh();
        $this->assertSame('delivered', $order->status);
        $this->assertSame('fulfilled', $order->fulfillment_status);
    }

    public function test_steadfast_webhook_moves_status_to_in_transit(): void
    {
        $store = $this->createStore();
        Vendor::factory()->create(['store_id' => $store->id]);
        $order = Order::factory()->create(['store_id' => $store->id, 'status' => 'shipped']);

        $fulfillment = OrderFulfillment::create([
            'order_id' => $order->id,
            'carrier' => 'steadfast',
            'tracking_number' => 'SF-987',
            'status' => 'shipped',
        ]);

        $response = $this->post('/api/webhooks/couriers/steadfast', [
            'consignment_id' => 'SF-987',
            'status' => 'in_transit',
        ], ['Accept' => 'application/json']);

        $response->assertStatus(200);

        $fulfillment->refresh();
        $this->assertSame('in_transit', $fulfillment->status);
    }

    public function test_redx_webhook_ignored_when_fulfillment_not_found(): void
    {
        $response = $this->post('/api/webhooks/couriers/redx', [
            'tracking_id' => 'RDX-NOPE',
            'status' => 'Delivered',
        ], ['Accept' => 'application/json']);

        // Controller returns 200 so courier does not retry.
        $response->assertStatus(200);
    }
}
