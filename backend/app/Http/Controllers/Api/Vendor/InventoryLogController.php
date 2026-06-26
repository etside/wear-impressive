<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\InventoryLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Vendor Dashboard
 */
class InventoryLogController extends Controller
{
    /**
     * GET /api/vendor/inventory-logs
     *
     * Filters: branch_id, product_id, variant_id, type, date_from, date_to.
     */
    public function index(Request $request): JsonResponse
    {
        $store = $request->store;

        $data = $request->validate([
            'branch_id' => ['nullable', 'integer'],
            'product_id' => ['nullable', 'integer'],
            'variant_id' => ['nullable', 'integer'],
            'type' => ['nullable', 'in:sale,return,restock,adjustment,transfer_in,transfer_out,damaged'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $query = InventoryLog::query()
            ->with(['product:id,name,sku', 'variant:id,product_id,sku,options', 'branch:id,name'])
            ->where('store_id', $store->id);

        if (! empty($data['branch_id'])) {
            $query->where('branch_id', $data['branch_id']);
        }

        if (! empty($data['product_id'])) {
            $query->where('product_id', $data['product_id']);
        }

        if (! empty($data['variant_id'])) {
            $query->where('variant_id', $data['variant_id']);
        }

        if (! empty($data['type'])) {
            $query->where('type', $data['type']);
        }

        if (! empty($data['date_from'])) {
            $query->whereDate('created_at', '>=', $data['date_from']);
        }

        if (! empty($data['date_to'])) {
            $query->whereDate('created_at', '<=', $data['date_to']);
        }

        $logs = $query->orderByDesc('id')->paginate($data['per_page'] ?? 30);

        return ApiResponse::success($logs);
    }
}
