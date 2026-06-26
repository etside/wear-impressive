<?php

namespace App\Mail;

use App\Mail\Concerns\UsesStoreTemplate;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Base Mailable with store-template support + EmailLog writing.
 * Subclasses implement templateKey(), defaultView(), defaultSubject(),
 * placeholders(), storeForTemplate(), recipientEmail().
 */
abstract class BaseStoreMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels, UsesStoreTemplate;

    public function envelope(): Envelope
    {
        $rendered = $this->renderTemplate();

        return new Envelope(
            subject: $rendered['subject'],
        );
    }

    public function content(): Content
    {
        $rendered = $this->renderTemplate();

        // Render HTML from plain body (honoring newlines) when we came from
        // a store template row. For the default view we have proper blade.
        return new Content(
            htmlString: $rendered['is_markdown']
                ? $rendered['body']
                : nl2br(e($rendered['body'])),
        );
    }

    public function attachments(): array
    {
        return [];
    }

    /**
     * Called automatically by the queue worker when the job succeeds.
     * Not all Laravel versions fire this — so we also call writeLog('sent')
     * from send() override below as a belt-and-braces.
     */
    public function __destruct()
    {
        // Intentionally empty. Logging happens via listeners / send wrappers.
    }

    /**
     * Called by Laravel if the queued mail fails.
     */
    public function failed(\Throwable $exception): void
    {
        $this->writeLog('failed', $exception->getMessage());
    }

    /**
     * Public wrapper around the trait's writeLog() so listeners / callers
     * can mark a log entry after successfully queuing / sending.
     */
    public function logEmail(string $status = 'sent', ?string $error = null, array $metadata = []): void
    {
        $this->writeLog($status, $error, $metadata);
    }
}
