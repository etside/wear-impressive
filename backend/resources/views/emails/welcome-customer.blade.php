@extends('emails.layout')

@section('content')
    <h2>Welcome to {{ $data['store_name'] }}!</h2>
    <p>Hi {{ $data['customer_name'] }}, we're thrilled to have you.</p>
    <p><a href="{{ $data['store_url'] }}" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;">Start exploring</a></p>
    <p>Cheers,<br>The {{ $data['store_name'] }} team</p>
@endsection
