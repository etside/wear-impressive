<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\BlogPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * @group Vendor Dashboard
 */
class BlogPostController extends Controller
{
    /**
     * GET /api/vendor/blog-posts
     * Filters: status (draft|published), category_id, search, is_featured
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $query = BlogPost::query()
            ->where('store_id', $storeId)
            ->with('category');

        if ($status = $request->query('status')) {
            if ($status === 'published') {
                $query->where('is_published', true);
            } elseif ($status === 'draft') {
                $query->where('is_published', false);
            }
        }

        if ($categoryId = $request->query('category_id')) {
            $query->where('blog_category_id', $categoryId);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('excerpt', 'like', "%{$search}%")
                    ->orWhere('content', 'like', "%{$search}%");
            });
        }

        if ($request->has('is_featured')) {
            $query->where('is_featured', (bool) $request->boolean('is_featured'));
        }

        $perPage = (int) $request->query('per_page', 20);
        $posts = $query->orderByDesc('created_at')->paginate($perPage);

        return ApiResponse::success($posts);
    }

    /**
     * POST /api/vendor/blog-posts
     */
    public function store(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'blog_category_id' => ['required', 'integer', 'exists:blog_categories,id'],
            'excerpt' => ['nullable', 'string'],
            'featured_image' => ['nullable', 'string'],
            'cover_image' => ['nullable', 'string'],
            'tags' => ['nullable', 'array'],
            'is_featured' => ['nullable', 'boolean'],
            'is_published' => ['nullable', 'boolean'],
            'published_at' => ['nullable', 'date'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string'],
            'url_handle' => ['nullable', 'string', 'max:255'],
        ]);

        // Slug generation (unique per store)
        $slug = $this->generateUniqueSlug($storeId, $data['title']);

        // Reading time (200 wpm)
        $wordCount = str_word_count(strip_tags($data['content']));
        $readingTime = max(1, (int) ceil($wordCount / 200));

        $user = $this->currentUser();
        $authorType = $this->currentUserType() ?: 'vendor';

        $post = BlogPost::create(array_merge($data, [
            'store_id' => $storeId,
            'slug' => $slug,
            'reading_time' => $readingTime,
            'author_type' => $authorType,
            'author_id' => $user?->id,
            'is_published' => $data['is_published'] ?? false,
            'is_featured' => $data['is_featured'] ?? false,
            'published_at' => ($data['is_published'] ?? false) ? ($data['published_at'] ?? now()) : ($data['published_at'] ?? null),
        ]));

        return ApiResponse::success($post->fresh('category'), 'Blog post created.', 201);
    }

    /**
     * GET /api/vendor/blog-posts/{post}
     */
    public function show(Request $request, BlogPost $blogPost): JsonResponse
    {
        $this->authorizeStore($request, $blogPost);

        if ($request->boolean('count_view')) {
            $blogPost->increment('view_count');
        }

        return ApiResponse::success($blogPost->load('category'));
    }

    /**
     * PUT /api/vendor/blog-posts/{post}
     */
    public function update(Request $request, BlogPost $blogPost): JsonResponse
    {
        $this->authorizeStore($request, $blogPost);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'content' => ['sometimes', 'string'],
            'blog_category_id' => ['sometimes', 'integer', 'exists:blog_categories,id'],
            'excerpt' => ['nullable', 'string'],
            'featured_image' => ['nullable', 'string'],
            'cover_image' => ['nullable', 'string'],
            'tags' => ['nullable', 'array'],
            'is_featured' => ['nullable', 'boolean'],
            'is_published' => ['nullable', 'boolean'],
            'published_at' => ['nullable', 'date'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string'],
            'url_handle' => ['nullable', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255'],
        ]);

        if (array_key_exists('title', $data) && ! array_key_exists('slug', $data)) {
            // Only regenerate slug if title changed AND caller didn't provide one
            if ($data['title'] !== $blogPost->title) {
                $data['slug'] = $this->generateUniqueSlug($blogPost->store_id, $data['title'], $blogPost->id);
            }
        }

        if (array_key_exists('content', $data)) {
            $wordCount = str_word_count(strip_tags($data['content']));
            $data['reading_time'] = max(1, (int) ceil($wordCount / 200));
        }

        $blogPost->update($data);

        return ApiResponse::success($blogPost->fresh('category'), 'Blog post updated.');
    }

    /**
     * DELETE /api/vendor/blog-posts/{post}
     */
    public function destroy(Request $request, BlogPost $blogPost): JsonResponse
    {
        $this->authorizeStore($request, $blogPost);
        $blogPost->delete();

        return ApiResponse::success(null, 'Blog post deleted.');
    }

    /**
     * POST /api/vendor/blog-posts/{post}/publish
     */
    public function publish(Request $request, BlogPost $blogPost): JsonResponse
    {
        $this->authorizeStore($request, $blogPost);

        $blogPost->update([
            'is_published' => true,
            'published_at' => $blogPost->published_at ?: now(),
        ]);

        return ApiResponse::success($blogPost->fresh(), 'Blog post published.');
    }

    /**
     * POST /api/vendor/blog-posts/{post}/unpublish
     */
    public function unpublish(Request $request, BlogPost $blogPost): JsonResponse
    {
        $this->authorizeStore($request, $blogPost);

        $blogPost->update(['is_published' => false]);

        return ApiResponse::success($blogPost->fresh(), 'Blog post unpublished.');
    }

    /**
     * POST /api/vendor/blog-posts/{post}/toggle-featured
     */
    public function toggleFeatured(Request $request, BlogPost $blogPost): JsonResponse
    {
        $this->authorizeStore($request, $blogPost);

        $blogPost->update(['is_featured' => ! $blogPost->is_featured]);

        return ApiResponse::success($blogPost->fresh(), 'Featured flag toggled.');
    }

    /**
     * Verify the model belongs to the current store.
     */
    protected function authorizeStore(Request $request, BlogPost $post): void
    {
        if ($post->store_id !== $this->currentStoreId($request)) {
            abort(response()->json([
                'success' => false,
                'message' => 'Not found.',
                'data' => null,
            ], 404));
        }
    }

    /**
     * Generate a unique slug for the store, ignoring a given id.
     */
    protected function generateUniqueSlug(int $storeId, string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title) ?: Str::random(8);
        $slug = $base;
        $i = 1;

        while (
            BlogPost::where('store_id', $storeId)
                ->where('slug', $slug)
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = $base.'-'.$i;
            $i++;
        }

        return $slug;
    }
}
