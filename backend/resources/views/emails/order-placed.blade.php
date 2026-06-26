@extends('emails.layout')

@section('content')
    <h2>Thank you for your order, {{ $data['customer_name'] }}!</h2>
    <p>We've received your order <strong>{{ $data['order_number'] }}</strong> and are getting it ready.</p>
    <p><strong>Order total:</strong> {{ $data['order_total'] }}</p>
    <p><a href="{{ $data['order_url'] }}" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;">View your order</a></p>
    <p>Thanks,<br>{{ $data['store_name'] }}</p>
@endsection
