<?php

namespace App\Services\Payments\Contracts;

use App\Models\Order;

interface PaymentGateway
{
    /**
     * Kick off a payment with the gateway. Returns at minimum:
     *  [
     *    'redirect_url'      => string,  // where the browser should go
     *    'gateway_reference' => string,  // id to store on the order
     *    'raw'               => array,   // the gateway's raw response
     *  ]
     *
     * @param  array<string,mixed>  $context  extra hints (e.g. return/cancel URLs)
     * @return array{redirect_url:?string, gateway_reference:?string, raw:array<string,mixed>}
     */
    public function initiate(Order $order, array $context = []): array;

    /**
     * Verify / settle a gateway callback payload.
     *
     * @param  string  $reference         gateway_reference stored on the order
     * @param  array<string,mixed>  $payload     raw request payload from the webhook
     * @return array{status:string, raw:array<string,mixed>, amount?:float}
     *   status is one of 'paid', 'failed', 'pending'.
     */
    public function verify(string $reference, array $payload): array;

    /**
     * Trigger a refund on the gateway side. Returns gateway's raw response.
     *
     * @return array<string,mixed>
     */
    public function refund(Order $order, float $amount): array;

    /**
     * Canonical lowercase identifier of this gateway ("sslcommerz" etc).
     */
    public function name(): string;
}
