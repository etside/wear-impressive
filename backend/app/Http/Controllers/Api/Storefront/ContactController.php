<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Storefront (Public)
 */
class ContactController extends Controller
{
    /**
     * POST /api/store/contact
     */
    public function store(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:10000'],
        ]);

        $message = ContactMessage::create([
            'store_id' => $store->id,
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'subject' => $data['subject'],
            'message' => $data['message'],
            'status' => 'new',
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 512) ?: null,
        ]);

        activity('contact')
            ->performedOn($message)
            ->withProperties([
                'subject' => $message->subject,
                'email' => $message->email,
            ])
            ->event('received')
            ->log('Contact message received');

        return ApiResponse::success([
            'id' => $message->id,
            'created_at' => $message->created_at,
        ], 'Message sent.', 201);
    }
}
