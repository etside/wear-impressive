<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Vendor\Segments\StoreCustomerSegmentRequest;
use App\Http\Requests\Vendor\Segments\UpdateCustomerSegmentRequest;
use App\Http\Responses\ApiResponse;
use App\Models\CustomerSegment;
use App\Jobs\SendBulkEmailJob;
use App\Models\Customer;
use App\Models\SmsLog;
use App\Services\SegmentCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * @group Vendor Dashboard
 */
class CustomerSegmentController extends Controller
{
    public function __construct(protected SegmentCalculator $calculator) {}

    /**
     * GET /api/vendor/customer-segments
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $segments = CustomerSegment::query()
            ->where('store_id', $storeId)
            ->orderByDesc('is_system')
            ->orderBy('name')
            ->get();

        return ApiResponse::success($segments);
    }

    /**
     * POST /api/vendor/customer-segments (only user segments)
     */
    public function store(StoreCustomerSegmentRequest $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $data = $request->validated();
        $data['store_id'] = $storeId;
        $data['is_system'] = false;

        // If conditions.match provided but top-level condition_match isn't, sync it.
        if (empty($data['condition_match']) && ! empty($data['conditions']['match'])) {
            $data['condition_match'] = $data['conditions']['match'];
        }

        $segment = CustomerSegment::create($data);

        return ApiResponse::success($segment, 'Segment created.', 201);
    }

    /**
     * GET /api/vendor/customer-segments/{segment}
     */
    public function show(Request $request, CustomerSegment $customer_segment): JsonResponse
    {
        $this->authorizeStoreAccess($request, $customer_segment);

        return ApiResponse::success($customer_segment);
    }

    /**
     * PATCH /api/vendor/customer-segments/{segment}
     */
    public function update(UpdateCustomerSegmentRequest $request, CustomerSegment $customer_segment): JsonResponse
    {
        $this->authorizeStoreAccess($request, $customer_segment);

        if ($customer_segment->is_system) {
            return ApiResponse::error('System segments cannot be modified.', 403);
        }

        $data = $request->validated();

        if (empty($data['condition_match']) && ! empty($data['conditions']['match'])) {
            $data['condition_match'] = $data['conditions']['match'];
        }

        $customer_segment->update($data);

        return ApiResponse::success($customer_segment, 'Segment updated.');
    }

    /**
     * DELETE /api/vendor/customer-segments/{segment}
     */
    public function destroy(Request $request, CustomerSegment $customer_segment): JsonResponse
    {
        $this->authorizeStoreAccess($request, $customer_segment);

        if ($customer_segment->is_system) {
            return ApiResponse::error('System segments cannot be deleted.', 403);
        }

        $customer_segment->delete();

        return ApiResponse::success(null, 'Segment deleted.');
    }

    /**
     * POST /api/vendor/customer-segments/{segment}/calculate
     */
    public function calculateMembers(Request $request, CustomerSegment $customer_segment): JsonResponse
    {
        $this->authorizeStoreAccess($request, $customer_segment);

        $count = $this->calculator->calculate($customer_segment);

        return ApiResponse::success([
            'segment_id' => $customer_segment->id,
            'customer_count' => $count,
            'last_calculated_at' => $customer_segment->fresh()->last_calculated_at,
        ], 'Segment members recalculated.');
    }

    /**
     * GET /api/vendor/customer-segments/{segment}/customers
     */
    public function customers(Request $request, CustomerSegment $customer_segment): JsonResponse
    {
        $this->authorizeStoreAccess($request, $customer_segment);

        $customers = $customer_segment->customers()
            ->paginate($request->input('per_page', 25));

        return ApiResponse::success($customers);
    }

    /**
     * GET /api/vendor/customer-segments/attribute-options
     *
     * Returns the distinct variant option labels (Size, Color, Fit, ...) and
     * the values seen for each label across this store's active products, so
     * the segment rule builder can populate its dropdowns dynamically.
     */
    public function attributeOptions(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $rows = DB::table('product_variants')
            ->join('products', 'products.id', '=', 'product_variants.product_id')
            ->where('products.store_id', $storeId)
            ->whereNull('products.deleted_at')
            ->pluck('product_variants.options')
            ->all();

        $labels = [];
        foreach ($rows as $raw) {
            if (! $raw) continue;
            $opts = is_string($raw) ? json_decode($raw, true) : (array) $raw;
            if (! is_array($opts)) continue;
            foreach ($opts as $label => $value) {
                if (! is_string($label) || ! is_scalar($value)) continue;
                $value = (string) $value;
                if ($value === '') continue;
                $labels[$label] = $labels[$label] ?? [];
                if (! in_array($value, $labels[$label], true)) {
                    $labels[$label][] = $value;
                }
            }
        }

        $out = [];
        foreach ($labels as $label => $values) {
            sort($values);
            $out[] = ['label' => $label, 'values' => array_values($values)];
        }
        usort($out, fn ($a, $b) => strcmp($a['label'], $b['label']));

        return ApiResponse::success($out);
    }

    /**
     * POST /api/vendor/customer-segments/{segment}/broadcast
     *
     * Send an email or SMS to every member of this segment. The segment is
     * recalculated fresh before dispatch so the recipient list is current.
     *
     * Body: { channel: "email"|"sms", subject?: string, body: string }
     */
    public function broadcast(Request $request, CustomerSegment $customer_segment): JsonResponse
    {
        $this->authorizeStoreAccess($request, $customer_segment);

        $data = $request->validate([
            'channel' => ['required', 'in:email,sms'],
            'subject' => ['nullable', 'string', 'max:255'],
            'body' => ['required', 'string'],
        ]);

        // Recalculate so memberships are up-to-date.
        $this->calculator->calculate($customer_segment);

        $ids = $customer_segment->customers()->pluck('customers.id')->all();

        if (empty($ids)) {
            return ApiResponse::error('This segment has no matching customers.', 422);
        }

        if ($data['channel'] === 'email') {
            $recipients = Customer::whereIn('id', $ids)->whereNotNull('email')->count();
            if ($recipients === 0) {
                return ApiResponse::error('No members have an email address.', 422);
            }
            foreach (array_chunk($ids, 100) as $chunk) {
                SendBulkEmailJob::dispatch(
                    storeId: $customer_segment->store_id,
                    customerIds: $chunk,
                    subject: (string) ($data['subject'] ?? ''),
                    body: $data['body'],
                    templateKey: null,
                );
            }
            return ApiResponse::success([
                'channel' => 'email',
                'recipients' => $recipients,
                'queued' => true,
            ], "Email queued for {$recipients} customer(s).");
        }

        // SMS: persist one row per recipient with status=pending. When a real
        // provider is wired in, a worker will pick these up.
        $phones = Customer::whereIn('id', $ids)
            ->whereNotNull('phone')
            ->pluck('phone', 'id');
        if ($phones->isEmpty()) {
            return ApiResponse::error('No members have a phone number.', 422);
        }
        $now = now();
        $rows = [];
        foreach ($phones as $phone) {
            $rows[] = [
                'store_id' => $customer_segment->store_id,
                'to_phone' => $phone,
                'message' => $data['body'],
                'status' => 'pending',
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }
        foreach (array_chunk($rows, 500) as $chunk) {
            SmsLog::insert($chunk);
        }

        return ApiResponse::success([
            'channel' => 'sms',
            'recipients' => $phones->count(),
            'queued' => true,
        ], "SMS queued for {$phones->count()} customer(s). Configure an SMS provider to deliver.");
    }

    /**
     * POST /api/vendor/customer-segments/preview
     *
     * Runs the given conditions against the store's customers and returns a
     * count + a sample list — without persisting the segment. Powers the
     * "Calculate matches" preview in the segment builder.
     */
    public function preview(Request $request): JsonResponse
    {
        $storeId = $this->currentStoreId($request);

        $data = $request->validate([
            'condition_match' => ['nullable', 'in:all,any'],
            'conditions' => ['nullable', 'array'],
            'conditions.match' => ['nullable', 'in:all,any'],
            'conditions.rules' => ['nullable', 'array'],
            'conditions.rules.*.field' => ['required_with:conditions.rules', 'string'],
            'conditions.rules.*.operator' => ['required_with:conditions.rules', 'string'],
            'conditions.rules.*.value' => ['nullable'],
        ]);

        $ephemeral = new CustomerSegment([
            'store_id' => $storeId,
            'conditions' => $data['conditions'] ?? ['match' => 'all', 'rules' => []],
            'condition_match' => $data['condition_match'] ?? ($data['conditions']['match'] ?? 'all'),
        ]);
        $ephemeral->store_id = $storeId;

        $builder = $this->calculator->queryForSegment($ephemeral);
        $count = (clone $builder)->count();
        $sample = (clone $builder)
            ->orderByDesc('total_spent')
            ->take(10)
            ->get(['id', 'name', 'email', 'phone', 'total_spent', 'total_orders']);

        return ApiResponse::success([
            'customer_count' => $count,
            'sample' => $sample,
        ]);
    }

    /**
     * Ensure segment belongs to current store.
     */
    protected function authorizeStoreAccess(Request $request, CustomerSegment $segment): void
    {
        $storeId = $this->currentStoreId($request);
        abort_unless($segment->store_id === $storeId, 404, 'Segment not found.');
    }
}
