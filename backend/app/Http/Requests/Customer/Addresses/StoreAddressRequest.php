<?php

namespace App\Http\Requests\Customer\Addresses;

use Illuminate\Foundation\Http\FormRequest;

class StoreAddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'label' => ['nullable', 'in:home,office,other'],
            'full_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:32'],
            'address_line_1' => ['required', 'string', 'max:500'],
            'address_line_2' => ['nullable', 'string', 'max:500'],
            'division' => ['nullable', 'string', 'max:100'],
            'district' => ['nullable', 'string', 'max:100'],
            'thana' => ['nullable', 'string', 'max:100'],
            'area' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }
}
