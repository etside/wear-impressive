@extends('emails.layout')

@section('content')
    <h2>Reset your password</h2>
    <p>Hi {{ $data['customer_name'] }}, you requested a password reset. Click the button below to set a new password (valid for 60 minutes).</p>
    <p><a href="{{ $data['reset_url'] }}" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;">Reset password</a></p>
    <p>If you didn't request this, you can safely ignore this email.</p>
    <p>{{ $data['store_name'] }}</p>
@endsection
