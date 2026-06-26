<?php

namespace App\Http\Requests\Vendor\Customers;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $storeId = $this->storeId();
        $customerId = $this->route('customer')?->id ?? $this->route('customer');

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'nullable',
                'email',
                'max:255',
                Rule::unique('customers', 'email')
                    ->ignore($customerId)
                    ->where(fn ($q) => $q->where('store_id', $storeId))
                    ->whereNull('deleted_at'),
            ],
            'phone' => [
                'sometimes',
                'nullable',
                'string',
                'max:32',
                Rule::unique('customers', 'phone')
                    ->ignore($customerId)
                    ->where(fn ($q) => $q->where('store_id', $storeId))
                    ->whereNull('deleted_at'),
            ],
            'password' => ['sometimes', 'nullable', 'string', 'min:6'],
            'avatar' => ['sometimes', 'nullable', 'string', 'max:500'],
            'date_of_birth' => ['sometimes', 'nullable', 'date'],
            'gender' => ['sometimes', 'nullable', 'in:male,female,other'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'tags' => ['sometimes', 'nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
            'metadata' => ['sometimes', 'nullable', 'array'],
        ];
    }

    protected function storeId(): ?int
    {
        $store = $this->attributes->get('store') ?? ($this->store ?? null);

        return $store?->id;
    }
}
