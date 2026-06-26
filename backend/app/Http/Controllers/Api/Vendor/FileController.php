<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\File;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * @group Vendor Dashboard
 */
class FileController extends Controller
{
    /**
     * GET /api/vendor/files
     * Filters: mime_type, folder, search, tags
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $query = File::where('store_id', $storeId);

        if ($mime = $request->query('mime_type')) {
            // Allow prefix match e.g. "image/"
            if (str_ends_with($mime, '/')) {
                $query->where('mime_type', 'like', $mime.'%');
            } else {
                $query->where('mime_type', $mime);
            }
        }

        if ($folder = $request->query('folder')) {
            $query->where('folder', $folder);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('original_name', 'like', "%{$search}%")
                    ->orWhere('alt_text', 'like', "%{$search}%");
            });
        }

        if ($tags = $request->query('tags')) {
            $tagsArr = is_array($tags) ? $tags : explode(',', $tags);
            foreach ($tagsArr as $tag) {
                $query->whereJsonContains('tags', trim($tag));
            }
        }

        $perPage = (int) $request->query('per_page', 48);
        $files = $query->orderByDesc('created_at')->paginate($perPage);

        // Append URL to each record
        $files->getCollection()->transform(function (File $f) {
            $f->url = $f->path ? Storage::disk($f->disk ?: 'public')->url($f->path) : null;

            return $f;
        });

        return ApiResponse::success($files);
    }

    /**
     * POST /api/vendor/files
     * Multipart upload: file (required), folder?, alt_text?, tags[]?
     */
    public function store(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $request->validate([
            'file' => ['required', 'file', 'max:20480'], // 20MB
            'folder' => ['nullable', 'string', 'max:255'],
            'alt_text' => ['nullable', 'string', 'max:255'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:64'],
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $upload = $request->file('file');
        $directory = "stores/{$storeId}/files";
        $path = Storage::disk('public')->putFile($directory, $upload);

        $user = $this->currentUser();

        $file = File::create([
            'store_id' => $storeId,
            'uploaded_by_type' => $this->currentUserType(),
            'uploaded_by_id' => $user?->id,
            'name' => $request->input('name', $upload->getClientOriginalName()),
            'original_name' => $upload->getClientOriginalName(),
            'path' => $path,
            'disk' => 'public',
            'mime_type' => $upload->getMimeType(),
            'size' => $upload->getSize(),
            'alt_text' => $request->input('alt_text'),
            'folder' => $request->input('folder'),
            'tags' => $request->input('tags'),
        ]);

        $file->url = Storage::disk('public')->url($file->path);

        return ApiResponse::success($file, 'File uploaded.', 201);
    }

    /**
     * GET /api/vendor/files/{file}
     */
    public function show(Request $request, File $file): JsonResponse
    {
        $this->authorizeStore($request, $file);
        $file->url = $file->path ? Storage::disk($file->disk ?: 'public')->url($file->path) : null;

        return ApiResponse::success($file);
    }

    /**
     * PATCH/PUT /api/vendor/files/{file}
     * Rename, change alt_text, tags, folder.
     */
    public function update(Request $request, File $file): JsonResponse
    {
        $this->authorizeStore($request, $file);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'alt_text' => ['nullable', 'string', 'max:255'],
            'folder' => ['nullable', 'string', 'max:255'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:64'],
        ]);

        $file->update($data);
        $file->url = $file->path ? Storage::disk($file->disk ?: 'public')->url($file->path) : null;

        return ApiResponse::success($file->fresh(), 'File updated.');
    }

    /**
     * DELETE /api/vendor/files/{file}
     */
    public function destroy(Request $request, File $file): JsonResponse
    {
        $this->authorizeStore($request, $file);

        if ($file->path) {
            Storage::disk($file->disk ?: 'public')->delete($file->path);
        }

        $file->delete();

        return ApiResponse::success(null, 'File deleted.');
    }

    /**
     * POST /api/vendor/files/bulk-delete
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer'],
        ]);

        $files = File::where('store_id', $storeId)->whereIn('id', $data['ids'])->get();
        $deleted = 0;

        foreach ($files as $file) {
            if ($file->path) {
                Storage::disk($file->disk ?: 'public')->delete($file->path);
            }
            $file->delete();
            $deleted++;
        }

        return ApiResponse::success(['deleted' => $deleted], 'Files deleted.');
    }

    protected function authorizeStore(Request $request, File $file): void
    {
        if ($file->store_id !== $this->currentStoreId($request)) {
            abort(response()->json([
                'success' => false,
                'message' => 'Not found.',
                'data' => null,
            ], 404));
        }
    }
}
