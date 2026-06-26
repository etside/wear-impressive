<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\Addresses\StoreAddressRequest;
use App\Http\Requests\Customer\Addresses\UpdateAddressRequest;
use App\Http\Responses\ApiResponse;
use App\Models\CustomerAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * @group Customer Account
 */
class AddressController extends Controller
{
    /**
     * GET /api/customer/addresses
     */
    public function index(Request $request): JsonResponse
    {
        $customer = $this->requireCustomer($request);

        $addresses = $customer->addresses()
            ->orderByDesc('is_default')
            ->orderByDesc('id')
            ->get();

        return ApiResponse::success($addresses);
    }

    /**
     * POST /api/customer/addresses
     */
    public function store(StoreAddressRequest $request): JsonResponse
    {
        $customer = $this->requireCustomer($request);

        $data = $request->validated();
        $data['customer_id'] = $customer->id;

        $isDefault = (bool) ($data['is_default'] ?? false);

        // If this customer has no addresses yet, force default=true.
        if (! $customer->addresses()->exists()) {
            $isDefault = true;
        }

        $address = DB::transaction(function () use ($customer, $data, $isDefault) {
            if ($isDefault) {
                CustomerAddress::where('customer_id', $customer->id)
                    ->update(['is_default' => false]);
            }

            $data['is_default'] = $isDefault;

            return CustomerAddress::create($data);
        });

        return ApiResponse::success($address, 'Address created.', 201);
    }

    /**
     * GET /api/customer/addresses/{address}
     */
    public function show(Request $request, CustomerAddress $address): JsonResponse
    {
        $this->authorizeOwnership($request, $address);

        return ApiResponse::success($address);
    }

    /**
     * PUT /api/customer/addresses/{address}
     */
    public function update(UpdateAddressRequest $request, CustomerAddress $address): JsonResponse
    {
        $this->authorizeOwnership($request, $address);

        $data = $request->validated();

        DB::transaction(function () use ($address, $data) {
            if (array_key_exists('is_default', $data) && $data['is_default']) {
                CustomerAddress::where('customer_id', $address->customer_id)
                    ->where('id', '!=', $address->id)
                    ->update(['is_default' => false]);
            }

            $address->update($data);
        });

        return ApiResponse::success($address->fresh(), 'Address updated.');
    }

    /**
     * DELETE /api/customer/addresses/{address}
     */
    public function destroy(Request $request, CustomerAddress $address): JsonResponse
    {
        $this->authorizeOwnership($request, $address);

        $wasDefault = (bool) $address->is_default;
        $customerId = $address->customer_id;
        $address->delete();

        // If we removed the default, promote the newest remaining.
        if ($wasDefault) {
            $next = CustomerAddress::where('customer_id', $customerId)
                ->latest('id')
                ->first();
            $next?->update(['is_default' => true]);
        }

        return ApiResponse::success(null, 'Address deleted.');
    }

    /**
     * POST /api/customer/addresses/{address}/set-default
     */
    public function setDefault(Request $request, CustomerAddress $address): JsonResponse
    {
        $this->authorizeOwnership($request, $address);

        DB::transaction(function () use ($address) {
            CustomerAddress::where('customer_id', $address->customer_id)
                ->update(['is_default' => false]);
            $address->update(['is_default' => true]);
        });

        return ApiResponse::success($address->fresh(), 'Default address set.');
    }

    protected function requireCustomer(Request $request)
    {
        $customer = $request->user('customer');
        abort_if(! $customer, 401, 'Unauthenticated.');

        return $customer;
    }

    protected function authorizeOwnership(Request $request, CustomerAddress $address): void
    {
        $customer = $this->requireCustomer($request);
        abort_unless($address->customer_id === $customer->id, 404, 'Address not found.');
    }
}
