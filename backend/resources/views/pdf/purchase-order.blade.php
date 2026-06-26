<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Purchase Order {{ $po->po_number }}</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1f2937; margin: 0; padding: 24px; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        h2 { font-size: 14px; margin: 16px 0 6px; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
        .meta { width: 100%; margin-bottom: 16px; }
        .meta td { vertical-align: top; padding: 0; }
        .meta .right { text-align: right; }
        .small { color: #6b7280; font-size: 11px; }
        table.items { width: 100%; border-collapse: collapse; margin-top: 8px; }
        table.items th, table.items td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
        table.items th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: 0.02em; }
        table.items td.num, table.items th.num { text-align: right; }
        .totals { width: 260px; float: right; margin-top: 12px; }
        .totals td { padding: 4px 8px; }
        .totals td.label { text-align: right; color: #374151; }
        .totals td.value { text-align: right; width: 100px; }
        .totals tr.grand td { font-weight: bold; border-top: 2px solid #111827; }
        .notes { clear: both; margin-top: 24px; padding: 8px 12px; background: #f9fafb; border-left: 3px solid #9ca3af; font-size: 11px; white-space: pre-wrap; }
        .status { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #e0e7ff; color: #3730a3; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
    </style>
</head>
<body>
    <table class="meta">
        <tr>
            <td>
                <h1>{{ $po->store?->name ?? 'Purchase Order' }}</h1>
                @if ($po->store?->domain)
                    <div class="small">{{ $po->store->domain }}</div>
                @endif
                @if ($po->store?->contact_email)
                    <div class="small">{{ $po->store->contact_email }}</div>
                @endif
            </td>
            <td class="right">
                <div><strong>Purchase Order</strong></div>
                <div>PO #: {{ $po->po_number }}</div>
                @if ($po->reference_number)
                    <div>Ref: {{ $po->reference_number }}</div>
                @endif
                <div>Status: <span class="status">{{ $po->status }}</span></div>
                <div>Created: {{ optional($po->created_at)->format('Y-m-d') }}</div>
                @if ($po->expected_arrival)
                    <div>Expected: {{ \Carbon\Carbon::parse($po->expected_arrival)->format('Y-m-d') }}</div>
                @endif
            </td>
        </tr>
    </table>

    <table class="meta">
        <tr>
            <td style="width:50%;">
                <h2>Supplier</h2>
                <div><strong>{{ $po->supplier?->name ?? '—' }}</strong></div>
                @if ($po->supplier?->contact_name)
                    <div>{{ $po->supplier->contact_name }}</div>
                @endif
                @if ($po->supplier?->email)
                    <div>{{ $po->supplier->email }}</div>
                @endif
                @if ($po->supplier?->phone)
                    <div>{{ $po->supplier->phone }}</div>
                @endif
                @if ($po->supplier?->address)
                    <div class="small">{{ $po->supplier->address }}</div>
                @endif
            </td>
            <td style="width:50%;">
                <h2>Deliver To</h2>
                <div><strong>{{ $po->branch?->name ?? '—' }}</strong></div>
                @if ($po->branch?->address)
                    <div class="small">{{ $po->branch->address }}</div>
                @endif
                @if ($po->carrier)
                    <div>Carrier: {{ $po->carrier }}</div>
                @endif
                @if ($po->tracking_number)
                    <div>Tracking: {{ $po->tracking_number }}</div>
                @endif
            </td>
        </tr>
    </table>

    <h2>Items</h2>
    <table class="items">
        <thead>
            <tr>
                <th style="width:40%;">Product</th>
                <th>SKU</th>
                <th class="num">Qty</th>
                <th class="num">Unit Cost</th>
                <th class="num">Tax %</th>
                <th class="num">Line Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($po->items as $item)
                <tr>
                    <td>
                        {{ $item->product?->name ?? ('Product #'.$item->product_id) }}
                        @if ($item->variant)
                            <div class="small">{{ $item->variant->sku }}</div>
                        @endif
                    </td>
                    <td>{{ $item->supplier_sku ?? $item->variant?->sku ?? $item->product?->sku ?? '—' }}</td>
                    <td class="num">{{ $item->quantity_ordered }}</td>
                    <td class="num">{{ number_format((float) $item->unit_cost, 2) }}</td>
                    <td class="num">{{ number_format((float) ($item->tax_rate ?? 0), 2) }}</td>
                    <td class="num">{{ number_format((float) $item->subtotal, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals">
        <tr>
            <td class="label">Subtotal</td>
            <td class="value">{{ number_format((float) $po->subtotal, 2) }}</td>
        </tr>
        <tr>
            <td class="label">Tax</td>
            <td class="value">{{ number_format((float) $po->tax_amount, 2) }}</td>
        </tr>
        <tr>
            <td class="label">Shipping</td>
            <td class="value">{{ number_format((float) $po->shipping_amount, 2) }}</td>
        </tr>
        <tr class="grand">
            <td class="label">Total ({{ $po->supplier_currency ?? 'BDT' }})</td>
            <td class="value">{{ number_format((float) $po->total, 2) }}</td>
        </tr>
    </table>

    @if ($po->note_to_supplier)
        <div class="notes">
            <strong>Notes to supplier</strong>
            <br>{{ $po->note_to_supplier }}
        </div>
    @endif
</body>
</html>
