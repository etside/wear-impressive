<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Vendor\Customers\StoreCustomerRequest;
use App\Http\Requests\Vendor\Customers\UpdateCustomerRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\CustomerSegment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * @group Vendor Dashboard
 */
class CustomerController extends Controller
{
    /**
     * GET /api/vendor/customers
     *
     * Filters:
     *  - search: name / email / phone (like)
     *  - segment_id: only customers belonging to segment
     *  - has_orders: 1/0
     *  - sort: total_spent | total_orders | created_at (default: created_at)
     *  - direction: asc|desc (default: desc)
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'segment_id' => ['nullable', 'integer'],
            'has_orders' => ['nullable', 'boolean'],
            'sort' => ['nullable', 'in:total_spent,total_orders,created_at,last_order_at,name'],
            'direction' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $query = Customer::query()->where('store_id', $storeId);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($segmentId = $request->input('segment_id')) {
            $query->whereHas('segments', function ($q) use ($segmentId) {
                $q->where('customer_segments.id', $segmentId);
            });
        }

        if ($request->filled('has_orders')) {
            $hasOrders = filter_var($request->input('has_orders'), FILTER_VALIDATE_BOOLEAN);
            if ($hasOrders) {
                $query->where('total_orders', '>', 0);
            } else {
                $query->where('total_orders', '=', 0);
            }
        }

        $sort = $request->input('sort', 'created_at');
        $direction = $request->input('direction', 'desc');
        $query->orderBy($sort, $direction);

        $customers = $query->paginate($request->input('per_page', 25));

        return ApiResponse::success($customers);
    }

    /**
     * GET /api/vendor/customers/{customer}
     */
    public function show(Request $request, Customer $customer): JsonResponse
    {
        $this->authorizeStoreAccess($request, $customer);

        $customer->load([
            'addresses',
            'segments',
            'orders' => fn ($q) => $q->latest()->limit(10),
        ]);

        return ApiResponse::success($customer);
    }

    /**
     * POST /api/vendor/customers (manual creation)
     */
    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $data = $request->validated();
        $data['store_id'] = $storeId;

        if (! empty($data['password'])) {
            // Password cast 'hashed' on model handles it.
        } else {
            unset($data['password']);
        }

        $customer = Customer::create($data);

        return ApiResponse::success($customer, 'Customer created.', 201);
    }

    /**
     * POST /api/vendor/customers/import
     *
     * Bulk-import customers from a parsed CSV.
     * Each row: { name (required), phone (required), address? }
     * Best-effort: rows that fail are reported in the errors array.
     */
    public function import(Request $request): JsonResponse
    {
        $store = $this->currentStore($request);

        if (! $store) {
            return ApiResponse::error('Store context is required.', 400);
        }

        $request->validate([
            'customers'         => ['required', 'array', 'min:1'],
            'customers.*.name'  => ['required', 'string', 'max:255'],
            'customers.*.phone' => ['required', 'string', 'max:32'],
            'customers.*.address' => ['nullable', 'string', 'max:500'],
        ]);

        $rows = $request->input('customers');
        $imported = 0;
        $errors   = [];

        foreach ($rows as $i => $row) {
            $rowNum = $i + 1;
            $name   = trim($row['name'] ?? '');
            $phone  = trim($row['phone'] ?? '');
            $address = trim($row['address'] ?? '');

            if ($name === '' || $phone === '') {
                $errors[] = ['row' => $rowNum, 'name' => $name ?: '(empty)', 'error' => 'Name and phone are required.'];
                continue;
            }

            // Duplicate phone check within this store
            $exists = Customer::where('store_id', $store->id)
                ->where('phone', $phone)
                ->whereNull('deleted_at')
                ->exists();

            if ($exists) {
                $errors[] = ['row' => $rowNum, 'name' => $name, 'error' => 'Phone number already exists.'];
                continue;
            }

            try {
                $customer = Customer::create([
                    'store_id' => $store->id,
                    'name'     => $name,
                    'phone'    => $phone,
                ]);

                if ($address !== '') {
                    CustomerAddress::create([
                        'customer_id'  => $customer->id,
                        'full_name'    => $name,
                        'phone'        => $phone,
                        'address_line_1' => $address,
                        'is_default'   => true,
                    ]);
                }

                $imported++;
            } catch (\Throwable $e) {
                $errors[] = ['row' => $rowNum, 'name' => $name, 'error' => 'Could not save: ' . $e->getMessage()];
            }
        }

        return ApiResponse::success([
            'imported' => $imported,
            'failed'   => count($errors),
            'errors'   => $errors,
        ], "{$imported} customer(s) imported.");
    }

    /**
     * PATCH /api/vendor/customers/{customer}
     */
    public function update(UpdateCustomerRequest $request, Customer $customer): JsonResponse
    {
        $this->authorizeStoreAccess($request, $customer);

        $data = $request->validated();

        if (array_key_exists('password', $data) && empty($data['password'])) {
            unset($data['password']);
        }

        $customer->update($data);

        return ApiResponse::success($customer, 'Customer updated.');
    }

    /**
     * DELETE /api/vendor/customers/{customer} — soft delete.
     */
    public function destroy(Request $request, Customer $customer): JsonResponse
    {
        $this->authorizeStoreAccess($request, $customer);

        $customer->delete();

        return ApiResponse::success(null, 'Customer deleted.');
    }

    /**
     * POST /api/vendor/customers/{customer}/notes
     *
     * Appends a timestamped note to the customer's notes field.
     */
    public function addNote(Request $request, Customer $customer): JsonResponse
    {
        $this->authorizeStoreAccess($request, $customer);

        $data = $request->validate([
            'note' => ['required', 'string', 'max:5000'],
        ]);

        $user = $this->currentUser();
        $author = $user?->name ?? $user?->email ?? 'System';
        $timestamp = Carbon::now()->toDateTimeString();

        $prefix = "[{$timestamp}] {$author}:";
        $entry = $prefix.' '.trim($data['note']);

        $existing = $customer->notes ? trim($customer->notes)."\n\n" : '';
        $customer->notes = $existing.$entry;
        $customer->save();

        return ApiResponse::success($customer->fresh(), 'Note added.');
    }

    /**
     * POST /api/vendor/customers/bulk-action
     *
     * Supported actions: delete, add_to_segment, export
     */
    public function bulkAction(Request $request): JsonResponse|StreamedResponse
    {
        $storeId = $this->currentStoreId($request);

        $data = $request->validate([
            'action' => ['required', 'in:delete,add_to_segment,export'],
            'customer_ids' => ['required', 'array', 'min:1'],
            'customer_ids.*' => ['integer'],
            'segment_id' => [
                'required_if:action,add_to_segment',
                Rule::exists('customer_segments', 'id')->where(
                    fn ($q) => $q->where('store_id', $storeId)
                ),
            ],
        ]);

        $customerIds = Customer::query()
            ->where('store_id', $storeId)
            ->whereIn('id', $data['customer_ids'])
            ->pluck('id')
            ->all();

        if (empty($customerIds)) {
            return ApiResponse::error('No matching customers found.', 404);
        }

        if ($data['action'] === 'delete') {
            Customer::whereIn('id', $customerIds)->delete();

            return ApiResponse::success([
                'affected' => count($customerIds),
            ], 'Customers soft-deleted.');
        }

        if ($data['action'] === 'add_to_segment') {
            $now = Carbon::now();
            $rows = array_map(fn ($id) => [
                'segment_id' => $data['segment_id'],
                'customer_id' => $id,
                'added_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ], $customerIds);

            DB::table('customer_segment_memberships')->upsert(
                $rows,
                ['segment_id', 'customer_id'],
                ['updated_at']
            );

            // Refresh customer_count.
            $count = DB::table('customer_segment_memberships')
                ->where('segment_id', $data['segment_id'])
                ->count();
            CustomerSegment::where('id', $data['segment_id'])->update([
                'customer_count' => $count,
            ]);

            return ApiResponse::success([
                'affected' => count($customerIds),
                'segment_id' => $data['segment_id'],
            ], 'Customers added to segment.');
        }

        // export — stream a CSV download.
        $rows = Customer::query()
            ->where('store_id', $storeId)
            ->whereIn('id', $customerIds)
            ->orderBy('id')
            ->get(['id', 'name', 'email', 'phone', 'total_spent', 'total_orders', 'created_at']);

        $filename = 'customers-'.Carbon::now()->format('Y-m-d').'.csv';

        activity('customer')
            ->withProperties([
                'count' => $rows->count(),
                'filename' => $filename,
            ])
            ->event('exported')
            ->log('Customers exported to CSV');

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            // UTF-8 BOM so Excel renders unicode correctly.
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['id', 'name', 'email', 'phone', 'total_spent', 'total_orders', 'created_at']);

            foreach ($rows as $row) {
                fputcsv($out, [
                    $row->id,
                    $row->name,
                    $row->email,
                    $row->phone,
                    $row->total_spent,
                    $row->total_orders,
                    optional($row->created_at)->toDateTimeString(),
                ]);
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * GET /api/vendor/customers/{customer}/orders
     */
    public function orders(Request $request, Customer $customer): JsonResponse
    {
        $this->authorizeStoreAccess($request, $customer);

        $orders = $customer->orders()
            ->with('items')
            ->latest()
            ->paginate($request->input('per_page', 20));

        return ApiResponse::success($orders);
    }

    /**
     * Ensure the customer belongs to the current store.
     */
    protected function authorizeStoreAccess(Request $request, Customer $customer): void
    {
        $storeId = $this->currentStoreId($request);
        abort_unless($customer->store_id === $storeId, 404, 'Customer not found.');
    }
}
