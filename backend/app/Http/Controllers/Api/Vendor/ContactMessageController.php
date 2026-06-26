<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Vendor Dashboard
 */
class ContactMessageController extends Controller
{
    /**
     * GET /api/vendor/contact-messages
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $request->validate([
            'status' => ['nullable', 'in:new,read,replied'],
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $query = ContactMessage::query()->where('store_id', $storeId);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('subject', 'like', "%{$search}%");
            });
        }

        $messages = $query->latest('id')->paginate((int) $request->input('per_page', 25));

        return ApiResponse::success($messages);
    }

    /**
     * GET /api/vendor/contact-messages/{message}
     */
    public function show(Request $request, ContactMessage $message): JsonResponse
    {
        $this->authorizeStoreAccess($request, $message);

        return ApiResponse::success($message);
    }

    /**
     * PATCH /api/vendor/contact-messages/{message}
     *
     * Body: { status: 'new'|'read'|'replied' }
     */
    public function update(Request $request, ContactMessage $message): JsonResponse
    {
        $this->authorizeStoreAccess($request, $message);

        $data = $request->validate([
            'status' => ['required', 'in:new,read,replied'],
        ]);

        $message->status = $data['status'];

        if ($data['status'] === 'replied') {
            $message->replied_at = now();
        }

        $message->save();

        activity('contact')
            ->performedOn($message)
            ->withProperties(['status' => $message->status])
            ->event('updated')
            ->log('Contact message status updated');

        return ApiResponse::success($message, 'Message updated.');
    }

    /**
     * DELETE /api/vendor/contact-messages/{message}
     */
    public function destroy(Request $request, ContactMessage $message): JsonResponse
    {
        $this->authorizeStoreAccess($request, $message);

        $message->delete();

        activity('contact')
            ->performedOn($message)
            ->event('deleted')
            ->log('Contact message deleted');

        return ApiResponse::success(null, 'Message deleted.');
    }

    protected function authorizeStoreAccess(Request $request, ContactMessage $message): void
    {
        $storeId = $this->currentStoreId($request);
        abort_unless($message->store_id === $storeId, 404, 'Message not found.');
    }
}
