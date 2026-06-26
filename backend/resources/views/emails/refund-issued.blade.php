@extends('emails.layout')

@section('content')
    <h2>Refund issued</h2>
    <p>Hi {{ $data['customer_name'] }}, a refund of <strong>{{ $data['refund_amount'] }} {{ $data['currency'] }}</strong> has been issued for your order <strong>{{ $data['order_number'] }}</strong>.</p>
    <p>The refund should appear in your account within 5-10 business days, depending on your bank.</p>
    <p>Thanks,<br>{{ $data['store_name'] }}</p>
@endsection
