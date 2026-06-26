@extends('emails.layout')

@section('content')
    <h2>Payment received</h2>
    <p>Hi {{ $data['customer_name'] }}, we've received your payment of <strong>{{ $data['amount'] }} {{ $data['currency'] }}</strong> for order <strong>{{ $data['order_number'] }}</strong>.</p>
    <p><strong>Method:</strong> {{ $data['payment_method'] }}
    @if(!empty($data['payment_reference']))
        <br><strong>Reference:</strong> {{ $data['payment_reference'] }}
    @endif
    </p>
    <p>Thanks,<br>{{ $data['store_name'] }}</p>
@endsection
