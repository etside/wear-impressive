<?php

namespace App\Http\Requests\Vendor\Segments;

use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerSegmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'condition_match' => ['nullable', 'in:all,any'],
            'conditions' => ['nullable', 'array'],
            'conditions.match' => ['nullable', 'in:all,any'],
            'conditions.rules' => ['nullable', 'array'],
            'conditions.rules.*.field' => ['required_with:conditions.rules', 'string', 'in:total_spent,total_orders,loyalty_points,last_order_at,created_at,tags,email,phone,name,ordered_attribute'],
            'conditions.rules.*.operator' => ['required_with:conditions.rules', 'string', 'in:=,!=,>,<,>=,<=,in,not_in,contains,is_null,is_not_null,has,not_has'],
            'conditions.rules.*.value' => ['nullable'],
            'icon' => ['nullable', 'string', 'max:100'],
            'color' => ['nullable', 'string', 'max:100'],
        ];
    }
}
