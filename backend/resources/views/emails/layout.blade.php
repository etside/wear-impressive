<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $subject ?? 'Notification' }}</title>
</head>
<body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5; padding: 24px;">
    <div style="max-width: 600px; margin: 0 auto;">
        {{ $slot ?? '' }}
        @yield('content')
        <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">
            &copy; {{ date('Y') }} {{ $placeholders['store_name'] ?? config('app.name') }}.
        </p>
    </div>
</body>
</html>
