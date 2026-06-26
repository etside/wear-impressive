<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\CmsPage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Storefront (Public)
 */
class CmsPageController extends Controller
{
    /**
     * GET /api/store/pages/{slug}
     */
    public function show(Request $request, string $slug): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $page = CmsPage::query()
            ->where('store_id', $store->id)
            ->where('slug', $slug)
            ->where('status', 'published')
            ->first();

        if (! $page) {
            return ApiResponse::error('Page not found.', 404);
        }

        return ApiResponse::success($page, 'Page loaded.');
    }
}
