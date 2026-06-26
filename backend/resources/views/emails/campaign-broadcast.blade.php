@extends('emails.layout', ['subject' => $placeholders['campaign_name'] ?? 'Campaign'])

@section('content')
    <p>Hi {{ $placeholders['customer_name'] ?? 'there' }},</p>

    <div style="margin: 16px 0;">
        {!! nl2br(e($placeholders['body'] ?? '')) !!}
    </div>

    <p style="color: #6b7280; font-size: 12px;">
        You received this email because you are a customer of {{ $placeholders['store_name'] ?? '' }}.
    </p>
@endsection
