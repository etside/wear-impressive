@extends('emails.layout')

@section('content')
    <h2>You're invited to join {{ $data['store_name'] }}</h2>
    <p>Hi {{ $data['staff_name'] }}, {{ $data['invited_by'] }} has invited you to join <strong>{{ $data['store_name'] }}</strong> as <strong>{{ $data['role'] }}</strong>.</p>
    <p><a href="{{ $data['invite_url'] }}" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;">Accept invitation</a></p>
    <p>This link will let you set a password and start using your account.</p>
@endsection
