<?php

namespace App\Http\Requests\Customer\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $storeId = null;
        if (isset($this->store) && $this->store) {
            $storeId = $this->store->id;
        } elseif (app()->bound('current_store')) {
            $storeId = app('current_store')->id ?? null;
        }

        return [
            'name' => ['required', 'string', 'max:255'],
            // Phone is the primary identifier — required for every signup.
            // 11-digit Bangladeshi format (`01XXXXXXXXX`) enforced via regex
            // so accidental international/garbage input fails fast.
            'phone' => [
                'required',
                'string',
                'regex:/^01[3-9]\d{8}$/',
                'max:32',
                $storeId
                    ? Rule::unique('customers', 'phone')->where(fn ($q) => $q->where('store_id', $storeId)->whereNull('deleted_at'))
                    : 'unique:customers,phone',
            ],
            // Email is now optional. When provided it must still be unique
            // within the store so we don't accidentally create duplicates.
            'email' => [
                'nullable',
                'string',
                'email',
                'max:255',
                $storeId
                    ? Rule::unique('customers', 'email')->where(fn ($q) => $q->where('store_id', $storeId)->whereNull('deleted_at'))
                    : 'unique:customers,email',
            ],
            'password' => ['required', 'confirmed', Password::min(8)],
        ];
    }
}
