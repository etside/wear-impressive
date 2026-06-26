@extends('emails.layout')

@section('content')
    <h2>Your order has been delivered</h2>
    <p>Hi {{ $data['customer_name'] }}, your order <strong>{{ $data['order_number'] }}</strong> has been delivered. We hope you love it!</p>
    <p><a href="{{ $data['review_url'] }}" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;">Leave a review</a></p>
    <p>Thanks for shopping with us,<br>{{ $data['store_name'] }}</p>
@endsection
