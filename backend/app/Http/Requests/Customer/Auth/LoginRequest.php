<?php

namespace App\Http\Requests\Customer\Auth;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['nullable', 'required_without:phone', 'string', 'email'],
            'phone' => ['nullable', 'required_without:email', 'string'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Customer login is mobile-first — most callers only send `phone`. The
     * default Laravel `required_without` phrasing references the missing
     * field the customer doesn't even see ("The email field is required
     * when phone is not present"), which is confusing. We override both
     * sides to a single, friendly message.
     */
    public function messages(): array
    {
        return [
            'email.required_without' => 'Mobile number is required.',
            'phone.required_without' => 'Mobile number is required.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            if (! $this->filled('email') && ! $this->filled('phone')) {
                $validator->errors()->add('phone', 'Mobile number is required.');
            }
        });
    }
}
