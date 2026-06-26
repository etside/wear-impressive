<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\BlogCategory;
use App\Models\BlogPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Storefront (Public)
 */
class BlogController extends Controller
{
    /**
     * GET /api/store/blog
     */
    public function index(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $query = BlogPost::query()
            ->where('store_id', $store->id)
            ->where('is_published', true)
            ->with(['category:id,name,slug,color']);

        if ($request->filled('category')) {
            $catSlug = (string) $request->input('category');
            $query->whereHas('category', fn ($q) => $q->where('slug', $catSlug));
        }

        if ($request->filled('category_id')) {
            $query->where('blog_category_id', (int) $request->input('category_id'));
        }

        if ($request->filled('search')) {
            $term = (string) $request->input('search');
            $query->where(function ($q) use ($term) {
                $q->where('title', 'like', "%{$term}%")
                    ->orWhere('excerpt', 'like', "%{$term}%")
                    ->orWhere('content', 'like', "%{$term}%");
            });
        }

        $sort = (string) $request->input('sort', 'latest');

        switch ($sort) {
            case 'popular':
                $query->orderByDesc('view_count');
                break;
            case 'latest':
            default:
                $query->orderByDesc('published_at')->orderByDesc('created_at');
                break;
        }

        $perPage = min((int) $request->input('per_page', 12), 50);
        $paginator = $query->paginate($perPage);

        return ApiResponse::success($paginator, 'Blog posts loaded.');
    }

    /**
     * GET /api/store/blog/{slug}
     */
    public function show(Request $request, string $slug): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $post = BlogPost::query()
            ->where('store_id', $store->id)
            ->where('is_published', true)
            ->where('slug', $slug)
            ->with(['category:id,name,slug,color'])
            ->first();

        if (! $post) {
            return ApiResponse::error('Blog post not found.', 404);
        }

        // Increment view count.
        $post->increment('view_count');

        $related = BlogPost::query()
            ->where('store_id', $store->id)
            ->where('is_published', true)
            ->where('blog_category_id', $post->blog_category_id)
            ->where('id', '!=', $post->id)
            ->with(['category:id,name,slug,color'])
            ->orderByDesc('published_at')
            ->limit(3)
            ->get();

        return ApiResponse::success([
            'post' => $post,
            'related' => $related,
        ], 'Blog post loaded.');
    }

    /**
     * GET /api/store/blog/categories
     */
    public function categories(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $categories = BlogCategory::query()
            ->where('store_id', $store->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return ApiResponse::success($categories, 'Blog categories loaded.');
    }
}
