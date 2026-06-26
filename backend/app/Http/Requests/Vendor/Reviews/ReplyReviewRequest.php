<?php

namespace App\Http\Requests\Vendor\Reviews;

use Illuminate\Foundation\Http\FormRequest;

class ReplyReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reply_text' => ['required', 'string', 'max:5000'],
        ];
    }
}
