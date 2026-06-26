<?php

namespace App\Jobs;

use App\Models\Customer;
use App\Models\EmailLog;
use App\Models\EmailTemplate;
use App\Models\Store;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Send a marketing email campaign to a target list of customer IDs.
 * Throttled to 100 emails/minute via Laravel's RateLimiter.
 */
class SendBulkEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 600;

    /**
     * @param  array<int,int>  $customerIds
     */
    public function __construct(
        public int $storeId,
        public array $customerIds,
        public string $subject,
        public string $body,
        public ?string $templateKey = null,
    ) {
    }

    /**
     * Register the rate limiter on first boot.
     */
    protected function registerLimiter(): void
    {
        RateLimiter::for('bulk-emails', function () {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(100);
        });
    }

    public function middleware(): array
    {
        $this->registerLimiter();

        return [new RateLimited('bulk-emails')];
    }

    public function handle(): void
    {
        /** @var Store|null $store */
        $store = Store::find($this->storeId);

        if (! $store) {
            return;
        }

        // Allow {{customer_name}} / {{store_name}} substitution per recipient.
        $subjectTemplate = $this->subject;
        $bodyTemplate = $this->body;

        if ($this->templateKey) {
            $tpl = EmailTemplate::where('store_id', $this->storeId)
                ->where('template_key', $this->templateKey)
                ->where('is_active', true)
                ->first();
            if ($tpl) {
                $subjectTemplate = $tpl->subject;
                $bodyTemplate = $tpl->body;
            }
        }

        Customer::query()
            ->whereIn('id', $this->customerIds)
            ->whereNotNull('email')
            ->chunk(100, function ($customers) use ($store, $subjectTemplate, $bodyTemplate) {
                foreach ($customers as $customer) {
                    $subject = $this->replacePlaceholders($subjectTemplate, $customer, $store);
                    $body = $this->replacePlaceholders($bodyTemplate, $customer, $store);

                    try {
                        Mail::raw($body, function ($message) use ($customer, $subject) {
                            $message->to($customer->email)->subject($subject);
                        });

                        EmailLog::create([
                            'store_id' => $store->id,
                            'to_email' => $customer->email,
                            'template_key' => $this->templateKey ?? 'bulk_campaign',
                            'subject' => $subject,
                            'body' => $body,
                            'status' => 'sent',
                            'sent_at' => now(),
                            'metadata' => ['customer_id' => $customer->id, 'bulk' => true],
                        ]);
                    } catch (\Throwable $e) {
                        EmailLog::create([
                            'store_id' => $store->id,
                            'to_email' => $customer->email,
                            'template_key' => $this->templateKey ?? 'bulk_campaign',
                            'subject' => $subject,
                            'body' => $body,
                            'status' => 'failed',
                            'error' => $e->getMessage(),
                            'metadata' => ['customer_id' => $customer->id, 'bulk' => true],
                        ]);
                    }
                }
            });
    }

    protected function replacePlaceholders(string $template, Customer $customer, Store $store): string
    {
        return strtr($template, [
            '{{customer_name}}' => $customer->name ?? '',
            '{{customer_email}}' => $customer->email ?? '',
            '{{store_name}}' => $store->name ?? '',
            '{{store_url}}' => $store->domain ? 'https://'.$store->domain : url('/'),
        ]);
    }
}
