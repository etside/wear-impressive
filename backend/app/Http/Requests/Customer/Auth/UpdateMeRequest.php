<?php

namespace App\Http\Requests\Customer\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateMeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user('customer') !== null;
    }

    public function rules(): array
    {
        $customerId = $this->user('customer')?->id;
        $storeId = $this->user('customer')?->store_id;

        $unique = fn (string $column) => $storeId
            ? Rule::unique('customers', $column)
                ->ignore($customerId)
                ->where(fn ($q) => $q->where('store_id', $storeId)->whereNull('deleted_at'))
            : Rule::unique('customers', $column)->ignore($customerId);

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'string', 'email', 'max:255', $unique('email')],
            'phone' => ['sometimes', 'nullable', 'string', 'max:32', $unique('phone')],
            'date_of_birth' => ['sometimes', 'nullable', 'date'],
            'gender' => ['sometimes', 'nullable', 'in:male,female,other'],
            'avatar' => ['sometimes', 'nullable', 'string', 'max:1024'],

            // Password change is optional. When supplied, current_password must
            // match the customer's existing hash.
            'current_password' => ['required_with:password', 'string'],
            'password' => ['sometimes', 'confirmed', Password::min(8)],
        ];
    }
}
