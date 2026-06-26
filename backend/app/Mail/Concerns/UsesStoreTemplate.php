<?php

namespace App\Mail\Concerns;

use App\Models\EmailLog;
use App\Models\EmailTemplate;
use App\Models\Store;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Str;
use Throwable;

/**
 * Shared logic for Mailables that want to:
 *  - Look up a per-store EmailTemplate by a snake_cased template key
 *  - Fall back to a default blade/markdown view if no template row exists
 *  - Perform {{placeholder}} substitution on subject + body
 *  - Write an EmailLog row after dispatch (success or failure)
 *
 * Host classes must implement:
 *  - templateKey(): string   (e.g. "order_placed", "order_shipped")
 *  - defaultView(): string   (view dot-path for a built-in fallback body)
 *  - defaultSubject(): string
 *  - placeholders(): array   (['key' => 'value', ...])
 *  - storeForTemplate(): ?Store
 *  - recipientEmail(): ?string
 */
trait UsesStoreTemplate
{
    /**
     * Render subject + body using the store-customized template if present,
     * otherwise fall back to the default view.
     *
     * @return array{subject: string, body: string, is_markdown: bool, template_key: string}
     */
    protected function renderTemplate(): array
    {
        $store = $this->storeForTemplate();
        $placeholders = $this->placeholders();

        $template = null;
        if ($store) {
            $template = EmailTemplate::query()
                ->where('store_id', $store->id)
                ->where('template_key', $this->templateKey())
                ->where('is_active', true)
                ->first();
        }

        if ($template) {
            return [
                'subject' => $this->applyPlaceholders($template->subject, $placeholders),
                'body' => $this->applyPlaceholders($template->body, $placeholders),
                'is_markdown' => false,
                'template_key' => $this->templateKey(),
            ];
        }

        // Fallback: render the default blade view
        $viewPath = $this->defaultView();
        $body = '';

        if (View::exists($viewPath)) {
            $body = View::make($viewPath, [
                'placeholders' => $placeholders,
                'data' => $placeholders,
            ])->render();
        } else {
            // Last-resort fallback — build a minimal body from the placeholders.
            $body = $this->applyPlaceholders($this->defaultSubject(), $placeholders);
        }

        return [
            'subject' => $this->applyPlaceholders($this->defaultSubject(), $placeholders),
            'body' => $body,
            'is_markdown' => true,
            'template_key' => $this->templateKey(),
        ];
    }

    /**
     * Replace {{foo}} placeholders with values.
     */
    protected function applyPlaceholders(string $template, array $placeholders): string
    {
        foreach ($placeholders as $key => $value) {
            $template = str_replace('{{'.$key.'}}', (string) $value, $template);
            // Allow '{{ foo }}' with spaces too.
            $template = str_replace('{{ '.$key.' }}', (string) $value, $template);
        }

        return $template;
    }

    /**
     * Convert the current class's short name into snake_case.
     * "OrderPlacedMail" -> "order_placed".
     */
    protected function snakedClassName(): string
    {
        $short = class_basename(static::class);
        $short = preg_replace('/Mail$/', '', $short);

        return Str::snake($short);
    }

    /**
     * Write an EmailLog row. Safe to call inside a failed() hook.
     */
    protected function writeLog(string $status, ?string $error = null, array $metadata = []): void
    {
        try {
            $store = $this->storeForTemplate();
            $to = $this->recipientEmail();

            if (! $store || ! $to) {
                return;
            }

            $rendered = $this->renderTemplate();

            EmailLog::create([
                'store_id' => $store->id,
                'to_email' => $to,
                'template_key' => $this->templateKey(),
                'subject' => $rendered['subject'],
                'body' => $rendered['body'],
                'status' => $status,
                'sent_at' => $status === 'sent' ? now() : null,
                'error' => $error,
                'metadata' => array_merge([
                    'mailable' => class_basename(static::class),
                    'placeholders' => $this->placeholders(),
                ], $metadata),
            ]);
        } catch (Throwable $e) {
            // Swallow — logging must never break email delivery.
        }
    }

    /** Template lookup key ("order_placed", etc). */
    abstract protected function templateKey(): string;

    /** Default view path to fall back to. */
    abstract protected function defaultView(): string;

    /** Default subject if no template row exists. */
    abstract protected function defaultSubject(): string;

    /** Key/value map of placeholder replacements. */
    abstract protected function placeholders(): array;

    /** Store this email belongs to (for template lookup + logging). */
    abstract protected function storeForTemplate(): ?Store;

    /** Recipient email (for logging). */
    abstract protected function recipientEmail(): ?string;
}
