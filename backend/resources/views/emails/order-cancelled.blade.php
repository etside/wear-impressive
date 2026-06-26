@extends('emails.layout')

@section('content')
    <h2>Your order has been cancelled</h2>
    <p>Hi {{ $data['customer_name'] }}, your order <strong>{{ $data['order_number'] }}</strong> has been cancelled.</p>
    <p><strong>Reason:</strong> {{ $data['reason'] }}</p>
    <p>If you believe this was a mistake, please reach out to us.</p>
    <p>Thanks,<br>{{ $data['store_name'] }}</p>
@endsection
