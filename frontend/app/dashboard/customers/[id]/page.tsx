'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Mail, Phone, Calendar, ShoppingCart, DollarSign,
  Tag, X, Plus, MapPin, Pencil, StickyNote, Send, UserPlus,
} from 'lucide-react';
import { useLang } from '@/lib/i18n/context';
import { MobileRowCard } from '@/components/ui/mobile-row-card';
import { customersApi } from '@/lib/api/services/vendor-customers';
import { getApiErrorMessage } from '@/lib/api/client';
import { formatOrderNumber } from '@/lib/format-order-number';
import type { Order } from '@/lib/api/types';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
}

function formatMemberSince(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch { return iso; }
}

function statusVariantForOrder(status: Order['status']): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'delivered') return 'success';
  if (status === 'cancelled' || status === 'refunded') return 'error';
  if (status === 'returned') return 'warning';
  return 'info';
}

export default function CustomerDetailPage() {
  const params = useParams();
  const { t } = useLang();
  const queryClient = useQueryClient();
  const customerId = Number(Array.isArray(params.id) ? params.id[0] : params.id);

  const customerQuery = useQuery({
    queryKey: ['vendor', 'customer', customerId],
    queryFn: () => customersApi.get(customerId),
    enabled: Number.isFinite(customerId) && customerId > 0,
  });

  const ordersQuery = useQuery({
    queryKey: ['vendor', 'customer', customerId, 'orders'],
    queryFn: () => customersApi.orders(customerId),
    enabled: Number.isFinite(customerId) && customerId > 0,
  });

  const [newNote, setNewNote] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  const addNoteMutation = useMutation({
    mutationFn: (note: string) => customersApi.addNote(customerId, note),
    onSuccess: () => {
      setMutationError(null);
      setNewNote('');
      queryClient.invalidateQueries({ queryKey: ['vendor', 'customer', customerId] });
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to add note')),
  });

  const addNote = () => {
    const text = newNote.trim();
    if (!text) return;
    addNoteMutation.mutate(text);
  };

  if (customerQuery.isLoading) {
    return <div className="max-w-[1200px] mx-auto py-12 text-center text-sm text-gray-400">Loading customer...</div>;
  }

  if (customerQuery.error || !customerQuery.data) {
    return (
      <div className="max-w-[1200px] mx-auto py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {getApiErrorMessage(customerQuery.error, 'Failed to load customer')}
        </div>
        <Link href="/dashboard/customers" className="mt-4 inline-block">
          <Button variant="secondary" size="sm"><ArrowLeft size={14} /> Back to customers</Button>
        </Link>
      </div>
    );
  }

  const customer = customerQuery.data;
  const orders = ordersQuery.data?.data ?? [];
  const initials = customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const tags = customer.tags || [];
  const notesList = customer.notes ? [{ id: 1, text: customer.notes, date: formatDate(customer.created_at) }] : [];
  const defaultAddress = customer.addresses?.find(a => a.is_default) || customer.addresses?.[0];

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 mb-4">
        <Link href="/dashboard/customers" className="hover:text-gray-900 flex items-center gap-1">
          <ArrowLeft size={12} />
          Customers
        </Link>
        <span>/</span>
        <span className="text-gray-900">{customer.name}</span>
      </nav>

      {/* Header */}
      <PageHeader
        title={customer.name}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">
              <Mail size={14} /> Send email
            </Button>
            <Button size="sm">
              <ShoppingCart size={14} /> Create order
            </Button>
          </div>
        }
      />

      {mutationError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
          {mutationError}
        </div>
      )}

      {/* Customer Info Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center text-white text-lg font-bold shrink-0">
            {initials}
          </div>

          {/* Info grid */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <p className="text-[11px] text-gray-400 mb-0.5">Name</p>
              <p className="text-sm font-medium text-gray-900">{customer.name}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 mb-0.5 flex items-center gap-1"><Mail size={10} /> Email</p>
              <p className="text-sm text-gray-700">{customer.email || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 mb-0.5 flex items-center gap-1"><Phone size={10} /> Phone</p>
              <p className="text-sm text-gray-700">{customer.phone || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 mb-0.5 flex items-center gap-1"><Calendar size={10} /> Member since</p>
              <p className="text-sm text-gray-700">{formatMemberSince(customer.created_at)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 mb-0.5 flex items-center gap-1"><DollarSign size={10} /> Lifetime value</p>
              <p className="text-sm font-semibold text-gray-900">&#2547;{parseFloat(customer.total_spent || '0').toLocaleString()}</p>
              <p className="text-[10px] text-gray-400">{customer.total_orders} orders</p>
            </div>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag size={13} className="text-gray-400" />
              {tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Order History */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Order History</h3>
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Order #</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Total</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Items</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ordersQuery.isLoading && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-gray-400">Loading orders...</td></tr>
                  )}
                  {!ordersQuery.isLoading && orders.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-gray-400">No orders yet.</td></tr>
                  )}
                  {!ordersQuery.isLoading && orders.map(order => {
                    const itemCount = order.items?.reduce((s, it) => s + (it.quantity || 0), 0) ?? 0;
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/orders/${order.id}`}
                            className="font-medium text-blue-600 hover:underline cursor-pointer">
                            {formatOrderNumber(order.order_number)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(order.created_at)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={statusVariantForOrder(order.status)}>{order.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">&#2547;{parseFloat(order.total || '0').toLocaleString()}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{itemCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden p-3">
              {ordersQuery.isLoading && (
                <div className="px-4 py-10 text-center text-xs text-gray-400">Loading orders...</div>
              )}
              {!ordersQuery.isLoading && orders.length === 0 && (
                <div className="px-4 py-10 text-center text-xs text-gray-400">No orders yet.</div>
              )}
              {!ordersQuery.isLoading && orders.length > 0 && (
                <div className="space-y-2">
                  {orders.map(order => {
                    const itemCount = order.items?.reduce((s, it) => s + (it.quantity || 0), 0) ?? 0;
                    return (
                      <MobileRowCard
                        key={order.id}
                        href={`/dashboard/orders/${order.id}`}
                        header={
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-blue-600 text-sm">{formatOrderNumber(order.order_number)}</span>
                            <Badge variant={statusVariantForOrder(order.status)}>{order.status}</Badge>
                          </div>
                        }
                        trailing={
                          <span className="font-semibold text-gray-900 text-sm">৳{parseFloat(order.total || '0').toLocaleString()}</span>
                        }
                        meta={
                          <span className="text-gray-600">
                            {formatDate(order.created_at)} · {itemCount} item{itemCount === 1 ? '' : 's'}
                          </span>
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Showing {orders.length} of {customer.total_orders} orders</p>
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-5">
          {/* Default Address */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <MapPin size={14} className="text-gray-400" />
                Default Address
              </h3>
              <button className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <Pencil size={13} />
              </button>
            </div>
            {defaultAddress ? (
              <div className="text-sm text-gray-600 space-y-0.5">
                <p className="font-medium text-gray-900">{defaultAddress.full_name}</p>
                <p>{defaultAddress.address_line_1}</p>
                {defaultAddress.address_line_2 && <p>{defaultAddress.address_line_2}</p>}
                <p>{[defaultAddress.thana, defaultAddress.district, defaultAddress.division].filter(Boolean).join(', ')}{defaultAddress.postal_code ? ` ${defaultAddress.postal_code}` : ''}</p>
                <p className="text-xs text-gray-400 mt-1">{defaultAddress.phone}</p>
              </div>
            ) : (
              <p className="text-xs text-gray-400">No address on file</p>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
              <StickyNote size={14} className="text-gray-400" />
              Notes
            </h3>

            {/* Add note */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNote()}
                placeholder="Add a note..."
                className="flex-1 h-8 px-3 text-xs border border-gray-200 rounded-lg outline-none focus:border-gray-400"
              />
              <button onClick={addNote}
                disabled={addNoteMutation.isPending}
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-gray-900 text-white hover:bg-gray-800 shrink-0 disabled:opacity-50">
                <Send size={13} />
              </button>
            </div>

            {/* Notes list */}
            <div className="space-y-3">
              {notesList.length === 0 ? (
                <p className="text-xs text-gray-400">No notes yet</p>
              ) : notesList.map(note => (
                <div key={note.id} className="border-l-2 border-gray-200 pl-3">
                  <p className="text-xs text-gray-700">{note.text}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{note.date}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Customer info extra */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Loyalty</h3>
            <p className="text-xs text-gray-500">Points</p>
            <p className="text-lg font-bold text-gray-900">{customer.loyalty_points ?? 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
