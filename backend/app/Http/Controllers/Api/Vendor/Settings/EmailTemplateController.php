<?php

namespace App\Http\Controllers\Api\Vendor\Settings;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\EmailTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Vendor Dashboard
 * @subgroup Settings
 */
class EmailTemplateController extends Controller
{
    /**
     * GET /api/vendor/settings/email-templates
     *
     * Returns all templates. Seeds the 6 defaults if none exist for the store.
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $existingCount = EmailTemplate::where('store_id', $storeId)->count();

        if ($existingCount === 0) {
            $this->seedDefaults($storeId);
        } else {
            // Ensure each of the 6 keys exists; create any missing ones.
            $existingKeys = EmailTemplate::where('store_id', $storeId)->pluck('template_key')->all();
            foreach ($this->defaults() as $row) {
                if (! in_array($row['template_key'], $existingKeys, true)) {
                    EmailTemplate::create(array_merge($row, ['store_id' => $storeId]));
                }
            }
        }

        $templates = EmailTemplate::where('store_id', $storeId)
            ->orderBy('template_key')
            ->get();

        return ApiResponse::success($templates);
    }

    /**
     * PUT /api/vendor/settings/email-templates/{template}
     */
    public function update(Request $request, EmailTemplate $template): JsonResponse
    {
        $this->authorizeStore($request, $template);

        $data = $request->validate([
            'subject' => ['sometimes', 'string', 'max:255'],
            'body' => ['sometimes', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $data['last_modified_at'] = now();

        $template->update($data);

        return ApiResponse::success($template->fresh(), 'Email template updated.');
    }

    /**
     * POST /api/vendor/settings/email-templates/{template}/reset
     *
     * Reset the template to its built-in default.
     */
    public function resetToDefault(Request $request, EmailTemplate $template): JsonResponse
    {
        $this->authorizeStore($request, $template);

        $default = collect($this->defaults())
            ->firstWhere('template_key', $template->template_key);

        if (! $default) {
            return ApiResponse::error('No default available for this template.', 422);
        }

        $template->update([
            'subject' => $default['subject'],
            'body' => $default['body'],
            'variables' => $default['variables'] ?? null,
            'is_active' => true,
            'last_modified_at' => now(),
        ]);

        return ApiResponse::success($template->fresh(), 'Template reset to default.');
    }

    protected function authorizeStore(Request $request, EmailTemplate $template): void
    {
        if ($template->store_id !== $this->currentStoreId($request)) {
            abort(response()->json([
                'success' => false,
                'message' => 'Not found.',
                'data' => null,
            ], 404));
        }
    }

    /**
     * Seed all 6 default templates for a new store.
     */
    protected function seedDefaults(int $storeId): void
    {
        foreach ($this->defaults() as $row) {
            EmailTemplate::create(array_merge($row, ['store_id' => $storeId]));
        }
    }

    /**
     * Built-in default email templates.
     */
    protected function defaults(): array
    {
        return [
            [
                'template_key' => 'order_confirmation',
                'subject' => 'Your order {{order_number}} has been confirmed',
                'body' => "Hi {{customer_name}},\n\nThank you for your order! We've received your order {{order_number}} and are getting it ready.\n\nOrder Total: {{order_total}}\n\nYou can view your order here: {{order_url}}\n\nThanks,\n{{store_name}}",
                'variables' => ['customer_name', 'order_number', 'order_total', 'order_url', 'store_name'],
                'is_active' => true,
            ],
            [
                'template_key' => 'shipping_notification',
                'subject' => 'Your order {{order_number}} has been shipped',
                'body' => "Hi {{customer_name}},\n\nGood news — your order {{order_number}} is on its way!\n\nTracking number: {{tracking_number}}\nCarrier: {{carrier_name}}\nTrack here: {{tracking_url}}\n\nThanks,\n{{store_name}}",
                'variables' => ['customer_name', 'order_number', 'tracking_number', 'carrier_name', 'tracking_url', 'store_name'],
                'is_active' => true,
            ],
            [
                'template_key' => 'delivery_confirmation',
                'subject' => 'Your order {{order_number}} has been delivered',
                'body' => "Hi {{customer_name}},\n\nYour order {{order_number}} has been delivered. We hope you love it!\n\nIf you have a moment, we'd appreciate your review: {{review_url}}\n\nThanks for shopping with us,\n{{store_name}}",
                'variables' => ['customer_name', 'order_number', 'review_url', 'store_name'],
                'is_active' => true,
            ],
            [
                'template_key' => 'abandoned_cart',
                'subject' => 'You left something in your cart, {{customer_name}}',
                'body' => "Hi {{customer_name}},\n\nWe noticed you left some items in your cart. Complete your purchase before they're gone!\n\nView your cart: {{cart_url}}\n\nThanks,\n{{store_name}}",
                'variables' => ['customer_name', 'cart_url', 'store_name'],
                'is_active' => true,
            ],
            [
                'template_key' => 'welcome',
                'subject' => 'Welcome to {{store_name}}!',
                'body' => "Hi {{customer_name}},\n\nWelcome to {{store_name}}! We're thrilled to have you.\n\nStart exploring: {{store_url}}\n\nCheers,\nThe {{store_name}} team",
                'variables' => ['customer_name', 'store_name', 'store_url'],
                'is_active' => true,
            ],
            [
                'template_key' => 'password_reset',
                'subject' => 'Reset your {{store_name}} password',
                'body' => "Hi {{customer_name}},\n\nYou requested a password reset. Click the link below to set a new password (valid for 60 minutes):\n\n{{reset_url}}\n\nIf you didn't request this, you can safely ignore this email.\n\n{{store_name}}",
                'variables' => ['customer_name', 'reset_url', 'store_name'],
                'is_active' => true,
            ],
        ];
    }
}
