<?php

namespace App\Services\Sms;

use App\Models\SmsLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Sends SMS through the Gennet iSMS HTTP API (Ultimate SMS panel,
 * /api/v3/send-sms). Bangla messages are sent as `unicode`; plain ASCII
 * as `plain`. Every attempt — success or failure — is recorded in
 * `sms_logs` so the vendor has an audit trail.
 */
class GennetSmsService
{
    /**
     * Send one SMS. Returns true when the gateway accepted the message.
     * Never throws — callers (event listeners on the order-confirm path)
     * must not fail because the SMS gateway is down.
     */
    public function send(int $storeId, string $phone, string $message): bool
    {
        $url = (string) config('services.gennet.url');
        $apiToken = (string) config('services.gennet.api_key');
        $sid = (string) config('services.gennet.sender_id');

        $recipient = $this->normalizePhone($phone);

        if ($url === '' || $apiToken === '' || $recipient === null) {
            $this->log($storeId, $phone, $message, 'skipped', $recipient === null ? 'Invalid phone number' : 'Gateway not configured');

            return false;
        }

        $payload = [
            'api_token' => $apiToken,
            'sid' => $sid,
            'msisdn' => $recipient,
            'sms' => $message,
            'csms_id' => 'wi'.uniqid().mt_rand(10, 99),
        ];

        try {
            $response = Http::timeout(30)->connectTimeout(15)->post($url, $payload);

            $body = $response->json();
            $accepted = $response->successful()
                && strtoupper((string) ($body['status'] ?? '')) === 'SUCCESS';

            $this->log(
                $storeId,
                $recipient,
                $message,
                $accepted ? 'sent' : 'failed',
                $accepted ? null : json_encode($body ?? $response->body()),
            );

            if (! $accepted) {
                Log::warning('gennet.sms.rejected', ['phone' => $recipient, 'response' => $body ?? $response->body()]);
            }

            return $accepted;
        } catch (\Throwable $e) {
            $this->log($storeId, $recipient, $message, 'failed', $e->getMessage());
            Log::error('gennet.sms.exception', ['phone' => $recipient, 'error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * Normalise BD numbers to international `8801XXXXXXXXX` form.
     * Accepts `01XXXXXXXXX`, `+8801XXXXXXXXX`, `8801XXXXXXXXX`.
     * Returns null when the number doesn't look like a valid BD mobile.
     */
    public function normalizePhone(string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', $phone);

        if (preg_match('/^01[3-9]\d{8}$/', $digits)) {
            return '88'.$digits;
        }
        if (preg_match('/^8801[3-9]\d{8}$/', $digits)) {
            return $digits;
        }

        return null;
    }

    protected function log(int $storeId, ?string $phone, string $message, string $status, ?string $error): void
    {
        try {
            SmsLog::create([
                'store_id' => $storeId,
                'to_phone' => $phone ?? '',
                'message' => $message,
                'provider' => 'gennet',
                'status' => $status,
                'sent_at' => $status === 'sent' ? now() : null,
                'error' => $error,
            ]);
        } catch (\Throwable) {
            // Logging must never break the send path.
        }
    }
}
