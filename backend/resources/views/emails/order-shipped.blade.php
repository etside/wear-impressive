@extends('emails.layout')

@section('content')
    <h2>Your order is on its way!</h2>
    <p>Hi {{ $data['customer_name'] }}, your order <strong>{{ $data['order_number'] }}</strong> has shipped.</p>
    <p><strong>Carrier:</strong> {{ $data['carrier_name'] }}<br>
       <strong>Tracking #:</strong> {{ $data['tracking_number'] }}</p>
    @if(!empty($data['tracking_url']))
        <p><a href="{{ $data['tracking_url'] }}" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;">Track your shipment</a></p>
    @endif
    <p>Thanks,<br>{{ $data['store_name'] }}</p>
@endsection
