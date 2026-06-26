<?php

namespace Tests\Feature\Webhooks;

use App\Events\PaymentReceived;
use App\Events\UpdatedPaymentStatus;
use App\Models\Order;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Tests\Helpers\CreatesStores;
use Tests\TestCase;

class PaymentWebhookTest extends TestCase
{
    use CreatesStores;
    use RefreshDatabase;

    public function test_sslcommerz_webhook_transitions_order_to_paid(): void
    {
        Event::fake([PaymentReceived::class, UpdatedPaymentStatus::class]);

        // Match-by-payload-status branch (no val_id) — avoids the outbound validation call.
        $store = $this->createStore();
        $vendor = Vendor::factory()->create(['store_id' => $store->id]);
        $order = Order::factory()->create([
            'store_id' => $store->id,
            'payment_method' => 'sslcommerz',
            'payment_status' => 'pending',
            'status' => 'pending',
        ]);

        // Http::fake() in case the gateway still makes an outbound call.
        Http::fake();

        $response = $this->post('/api/webhooks/payments/sslcommerz', [
            'tran_id' => $order->order_number,
            'status' => 'VALID',
        ], ['Accept' => 'application/json']);

        $response->assertStatus(200)
            ->assertJsonPath('data.payment_status', 'paid');

        $order->refresh();
        $this->assertSame('paid', $order->payment_status);
        $this->assertSame('confirmed', $order->status);

        Event::assertDispatched(UpdatedPaymentStatus::class);
        Event::assertDispatched(PaymentReceived::class);
    }

    public function test_sslcommerz_webhook_unknown_order_returns_404(): void
    {
        Http::fake();

        $response = $this->post('/api/webhooks/payments/sslcommerz', [
            'tran_id' => 'NOPE-123',
            'status' => 'VALID',
        ], ['Accept' => 'application/json']);

        $response->assertStatus(404);
    }

    public function test_bkash_webhook_verifies_and_marks_paid(): void
    {
        $store = $this->createStore();
        Vendor::factory()->create(['store_id' => $store->id]);
        $order = Order::factory()->create([
            'store_id' => $store->id,
            'payment_method' => 'bkash',
            'order_number' => 'BKORD-'.strtoupper(substr(md5('x'), 0, 6)),
        ]);

        // Fake bKash grant_token + execute endpoints.
        Http::fake([
            '*grant*' => Http::response(['id_token' => 'fake-token'], 200),
            '*execute*' => Http::response([
                'transactionStatus' => 'Completed',
                'paymentID' => 'PMT-XYZ',
                'amount' => (string) $order->total,
                'statusCode' => '0000',
            ], 200),
            '*' => Http::response([], 200),
        ]);

        $response = $this->post('/api/webhooks/payments/bkash', [
            'paymentID' => 'PMT-XYZ',
            'merchantInvoiceNumber' => $order->order_number,
        ], ['Accept' => 'application/json']);

        $response->assertStatus(200)
            ->assertJsonPath('data.payment_status', 'paid');

        $order->refresh();
        $this->assertSame('paid', $order->payment_status);
    }

    public function test_nagad_webhook_marks_failed_on_failure_status(): void
    {
        $store = $this->createStore();
        Vendor::factory()->create(['store_id' => $store->id]);
        $order = Order::factory()->create([
            'store_id' => $store->id,
            'payment_method' => 'nagad',
        ]);

        Http::fake([
            '*verify/payment*' => Http::response(['status' => 'Failed'], 200),
            '*' => Http::response([], 200),
        ]);

        $response = $this->post('/api/webhooks/payments/nagad', [
            'payment_ref_id' => 'NG-REF-1',
            'order_id' => $order->order_number,
        ], ['Accept' => 'application/json']);

        $response->assertStatus(200)
            ->assertJsonPath('data.payment_status', 'failed');

        $order->refresh();
        $this->assertSame('failed', $order->payment_status);
    }
}
