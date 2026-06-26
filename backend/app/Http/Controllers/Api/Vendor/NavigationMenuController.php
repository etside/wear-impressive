<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\NavigationMenu;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * @group Vendor Dashboard
 */
class NavigationMenuController extends Controller
{
    /**
     * GET /api/vendor/navigation-menus
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $menus = NavigationMenu::where('store_id', $storeId)
            ->orderBy('name')
            ->get();

        return ApiResponse::success($menus);
    }

    /**
     * POST /api/vendor/navigation-menus
     */
    public function store(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'handle' => [
                'nullable', 'string', 'max:255',
                Rule::unique('navigation_menus', 'handle')
                    ->where(fn ($q) => $q->where('store_id', $storeId)->whereNull('deleted_at')),
            ],
            'items' => ['nullable', 'array'],
            'items.*.id' => ['nullable'],
            // `label` is the legacy single-language label, kept for backward
            // compatibility with menus saved before bilingual support landed.
            // New menus should use label_en/label_bn instead.
            'items.*.label' => ['nullable', 'string', 'max:120'],
            'items.*.label_en' => ['nullable', 'string', 'max:120'],
            'items.*.label_bn' => ['nullable', 'string', 'max:120'],
            'items.*.url' => ['nullable', 'string'],
            'items.*.link' => ['nullable', 'string'],
            'items.*.icon' => ['nullable', 'string'],
            'items.*.type' => ['nullable', 'string'],
            'items.*.target' => ['nullable', 'string'],
            'items.*.children' => ['nullable', 'array'],
        ]);

        $data['store_id'] = $storeId;
        $data['handle'] = $data['handle'] ?? $this->generateUniqueHandle($storeId, $data['name']);

        $menu = NavigationMenu::create($data);

        return ApiResponse::success($menu, 'Navigation menu created.', 201);
    }

    /**
     * GET /api/vendor/navigation-menus/{menu}
     */
    public function show(Request $request, NavigationMenu $navigationMenu): JsonResponse
    {
        $this->authorizeStore($request, $navigationMenu);

        return ApiResponse::success($navigationMenu);
    }

    /**
     * PUT /api/vendor/navigation-menus/{menu}
     */
    public function update(Request $request, NavigationMenu $navigationMenu): JsonResponse
    {
        $this->authorizeStore($request, $navigationMenu);
        $storeId = $navigationMenu->store_id;

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'handle' => [
                'sometimes', 'string', 'max:255',
                Rule::unique('navigation_menus', 'handle')
                    ->where(fn ($q) => $q->where('store_id', $storeId)->whereNull('deleted_at'))
                    ->ignore($navigationMenu->id),
            ],
            'items' => ['nullable', 'array'],
        ]);

        $navigationMenu->update($data);

        return ApiResponse::success($navigationMenu->fresh(), 'Navigation menu updated.');
    }

    /**
     * DELETE /api/vendor/navigation-menus/{menu}
     */
    public function destroy(Request $request, NavigationMenu $navigationMenu): JsonResponse
    {
        $this->authorizeStore($request, $navigationMenu);
        $navigationMenu->delete();

        return ApiResponse::success(null, 'Navigation menu deleted.');
    }

    protected function authorizeStore(Request $request, NavigationMenu $menu): void
    {
        if ($menu->store_id !== $this->currentStoreId($request)) {
            abort(response()->json([
                'success' => false,
                'message' => 'Not found.',
                'data' => null,
            ], 404));
        }
    }

    protected function generateUniqueHandle(int $storeId, string $name): string
    {
        $base = Str::slug($name) ?: Str::random(8);
        $handle = $base;
        $i = 1;

        while (NavigationMenu::where('store_id', $storeId)->where('handle', $handle)->exists()) {
            $handle = $base.'-'.$i;
            $i++;
        }

        return $handle;
    }
}
