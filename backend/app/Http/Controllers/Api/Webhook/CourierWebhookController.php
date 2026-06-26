<?php

namespace App\Http\Controllers\Api\Webhook;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\OrderFulfillment;
use App\Models\OrderTimeline;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CourierWebhookController extends Controller
{
    /**
     * POST /api/webhooks/couriers/pathao
     */
    public function pathao(Request $request): JsonResponse
    {
        $payload = $this->payload($request);

        $consignmentId = (string) (Arr::get($payload, 'consignment_id')
            ?? Arr::get($payload, 'merchant_order_id')
            ?? Arr::get($payload, 'order_id')
            ?? '');

        $status = (string) (Arr::get($payload, 'order_status')
            ?? Arr::get($payload, 'updated_status')
            ?? Arr::get($payload, 'status')
            ?? '');

        return $this->handle('pathao', $consignmentId, $status, $payload);
    }

    /**
     * POST /api/webhooks/couriers/steadfast
     */
    public function steadfast(Request $request): JsonResponse
    {
        $payload = $this->payload($request);

        $consignmentId = (string) (Arr::get($payload, 'consignment_id')
            ?? Arr::get($payload, 'tracking_code')
            ?? Arr::get($payload, 'invoice')
            ?? '');

        $status = (string) (Arr::get($payload, 'status')
            ?? Arr::get($payload, 'delivery_status')
            ?? '');

        return $this->handle('steadfast', $consignmentId, $status, $payload);
    }

    /**
     * POST /api/webhooks/couriers/redx
     */
    public function redx(Request $request): JsonResponse
    {
        $payload = $this->payload($request);

        $consignmentId = (string) (Arr::get($payload, 'tracking_id')
            ?? Arr::get($payload, 'parcel_id')
            ?? Arr::get($payload, 'merchant_invoice_id')
            ?? '');

        $status = (string) (Arr::get($payload, 'status')
            ?? Arr::get($payload, 'current_status')
            ?? '');

        return $this->handle('redx', $consignmentId, $status, $payload);
    }

    protected function handle(string $courier, string $reference, string $status, array $payload): JsonResponse
    {
        if ($reference === '') {
            Log::warning('[couriers] webhook.missing_reference', ['courier' => $courier]);

            // Return 200 so the courier does not retry forever.
            return ApiResponse::success(null, 'Missing reference (ignored).');
        }

        $fulfillment = $this->findFulfillment($reference);

        if (! $fulfillment) {
            Log::warning('[couriers] webhook.fulfillment_not_found', [
                'courier'   => $courier,
                'reference' => $reference,
            ]);

            // Return 200 so the courier does not retry forever.
            return ApiResponse::success(null, 'Fulfillment not found (ignored).');
        }

        $previousStatus = (string) $fulfillment->status;
        $mapped = $this->mapStatus($status);

        DB::transaction(function () use ($fulfillment, $courier, $reference, $status, $mapped, $payload) {
            $metadata = is_array($fulfillment->metadata) ? $fulfillment->metadata : [];
            $metadata['courier'] = $courier;
            $metadata['last_webhook'] = [
                'status'     => $status,
                'received_at' => now()->toIso8601String(),
                'payload'    => $payload,
            ];

            $attrs = ['metadata' => $metadata];

            if ($mapped) {
                $attrs['status'] = $mapped;
                if ($mapped === 'delivered' && ! $fulfillment->delivered_at) {
                    $attrs['delivered_at'] = now();
                }
                if (in_array($mapped, ['shipped', 'in_transit'], true) && ! $fulfillment->shipped_at) {
                    $attrs['shipped_at'] = now();
                }
            }

            $fulfillment->fill($attrs)->save();

            OrderTimeline::create([
                'order_id'    => $fulfillment->order_id,
                'event_type'  => 'fulfillment',
                'title'       => ucfirst($courier).' status: '.($status ?: 'update'),
                'description' => 'Reference: '.$reference,
                'user_type'   => 'system',
                'user_id'     => null,
                'metadata'    => [
                    'courier'        => $courier,
                    'reference'      => $reference,
                    'raw_status'     => $status,
                    'mapped_status'  => $mapped,
                ],
            ]);

            // Mirror delivered status to order.
            if ($mapped === 'delivered' && $fulfillment->order && $fulfillment->order->status !== 'delivered') {
                $order = $fulfillment->order;
                $order->status = 'delivered';
                $order->fulfillment_status = 'fulfilled';
                $order->save();
            }
        });

        Log::info('[couriers] webhook.processed', [
            'courier'         => $courier,
            'reference'       => $reference,
            'raw_status'      => $status,
            'mapped_status'   => $mapped,
            'previous_status' => $previousStatus,
            'fulfillment_id'  => $fulfillment->id,
        ]);

        return ApiResponse::success([
            'fulfillment_id' => $fulfillment->id,
            'status'         => $fulfillment->fresh()->status,
        ], 'Webhook processed.');
    }

    protected function findFulfillment(string $reference): ?OrderFulfillment
    {
        // Try tracking_number first.
        $fulfillment = OrderFulfillment::query()
            ->where('tracking_number', $reference)
            ->first();

        if ($fulfillment) {
            return $fulfillment;
        }

        // Fallback: scan by metadata->consignment_id. SQLite and MySQL both support
        // JSON path queries through Laravel's `json` column syntax.
        $fulfillment = OrderFulfillment::query()
            ->where('metadata->consignment_id', $reference)
            ->first();

        if ($fulfillment) {
            return $fulfillment;
        }

        // Final fallback: match by order number.
        return OrderFulfillment::query()
            ->whereHas('order', fn ($q) => $q->where('order_number', $reference))
            ->first();
    }

    protected function mapStatus(string $raw): ?string
    {
        $raw = strtolower(trim($raw));

        return match (true) {
            $raw === '' => null,
            str_contains($raw, 'deliver')     => 'delivered',
            str_contains($raw, 'return')      => 'failed',
            str_contains($raw, 'cancel')      => 'failed',
            str_contains($raw, 'fail')        => 'failed',
            str_contains($raw, 'hold')        => 'in_transit',
            str_contains($raw, 'transit')     => 'in_transit',
            str_contains($raw, 'hub')         => 'in_transit',
            str_contains($raw, 'pick')        => 'shipped',
            str_contains($raw, 'ship')        => 'shipped',
            str_contains($raw, 'assign')      => 'shipped',
            str_contains($raw, 'out_for')     => 'in_transit',
            default                           => null,
        };
    }

    protected function payload(Request $request): array
    {
        return array_merge(
            (array) $request->query(),
            (array) $request->post(),
            (array) ($request->json()->all() ?? []),
        );
    }
}
