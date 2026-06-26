<?php

namespace App\Http\Requests\Customer\Addresses;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'label' => ['sometimes', 'in:home,office,other'],
            'full_name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'string', 'max:32'],
            'address_line_1' => ['sometimes', 'string', 'max:500'],
            'address_line_2' => ['sometimes', 'nullable', 'string', 'max:500'],
            'division' => ['sometimes', 'nullable', 'string', 'max:100'],
            'district' => ['sometimes', 'nullable', 'string', 'max:100'],
            'thana' => ['sometimes', 'nullable', 'string', 'max:100'],
            'area' => ['sometimes', 'nullable', 'string', 'max:100'],
            'postal_code' => ['sometimes', 'nullable', 'string', 'max:20'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }
}
