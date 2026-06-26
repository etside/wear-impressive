@extends('emails.layout')

@section('content')
    <h2>You left something behind!</h2>
    <p>Hi {{ $data['customer_name'] }}, we noticed you left items worth <strong>{{ $data['total'] }}</strong> in your cart.</p>
    @if(!empty($data['discount_code']))
        <p>As a little nudge, here's a discount code you can use: <strong>{{ $data['discount_code'] }}</strong></p>
    @endif
    <p><a href="{{ $data['cart_url'] }}" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;">Resume your cart</a></p>
    <p>Thanks,<br>{{ $data['store_name'] }}</p>
@endsection
