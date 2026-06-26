'use client';

import { useShopBase } from '@/lib/use-shop-base';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { storeInfoApi, contactApi } from '@/lib/api/services/storefront';
import { getApiErrorMessage } from '@/lib/api/client';

const SUBJECT_OPTIONS = [
  'General Inquiry',
  'Order Issue',
  'Return / Refund',
  'Product Question',
  'Wholesale / Bulk Order',
  'Other',
];

/* ── Page ─────────────────────────────────────────────────────────── */
export default function ContactPage() {
  const __sb = useShopBase();


  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const storeQuery = useQuery({
    queryKey: ['storefront', 'store-info'],
    queryFn: () => storeInfoApi.show(),
  });
  const store = storeQuery.data;

  const submitMutation = useMutation({
    mutationFn: (payload: { name: string; email: string; phone?: string; subject: string; message: string }) =>
      contactApi.submit(payload),
    onSuccess: () => {
      setErrorMessage(null);
      setSubmitted(true);
    },
    onError: (err) => setErrorMessage(getApiErrorMessage(err, 'Failed to send message. Please try again.')),
  });

  const storeInfo = [
    {
      icon: <MapPin size={20} />,
      label: 'Address',
      value: [store?.address_line_1, store?.thana, store?.district, store?.division, store?.postal_code]
        .filter(Boolean)
        .join(', ') || '—',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: <Phone size={20} />,
      label: 'Phone',
      value: store?.phone || '—',
      color: 'bg-green-50 text-green-600',
    },
    {
      icon: <Mail size={20} />,
      label: 'Email',
      value: store?.email || '—',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      icon: <Clock size={20} />,
      label: 'Business Hours',
      value: 'Sun-Thu 10AM-8PM, Fri-Sat 11AM-9PM',
      color: 'bg-orange-50 text-orange-600',
    },
  ];

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    submitMutation.mutate({
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      subject: form.subject,
      message: form.message,
    });
  };

  const inputCls = 'w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 focus:border-gray-300 outline-none bg-white transition-colors';

  return (
    <div className="container-app pt-12 pb-10">
      {/* Breadcrumb */}
      <nav className="flex gap-2 text-xs text-gray-500 mb-6">
        <Link href={__sb} className="hover:text-gray-900">Home</Link>
        <span>/</span>
        <span className="text-gray-900">Contact Us</span>
      </nav>

      {/* Heading */}
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Contact Us</h1>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Have a question or need help? We would love to hear from you. Fill out the form below and our team will get back to you shortly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-5xl mx-auto">
        {/* Left: Contact Form */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            {submitted ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send size={22} className="text-green-600" />
                </div>
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-2.5 mb-4 inline-block">
                  Thanks, we will be in touch.
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Message Sent!</h3>
                <p className="text-sm text-gray-500 mb-4">Thank you for reaching out. We will get back to you within 24 hours.</p>
                <Button variant="secondary" size="sm" onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', subject: '', message: '' }); }}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
                    {errorMessage}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => update('name', e.target.value)}
                      placeholder="Your full name"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Email *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => update('email', e.target.value)}
                      placeholder="you@example.com"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => update('phone', e.target.value)}
                      placeholder="01XXX-XXXXXX"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Subject *</label>
                    <select
                      required
                      value={form.subject}
                      onChange={e => update('subject', e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Select a subject</option>
                      {SUBJECT_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Message *</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={e => update('message', e.target.value)}
                    placeholder="How can we help you?"
                    className={inputCls + ' resize-none'}
                  />
                </div>

                <Button type="submit" size="md" fullWidth disabled={submitMutation.isPending}>
                  <Send size={15} /> {submitMutation.isPending ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Right: Store Info Cards */}
        <div className="lg:col-span-2 space-y-4">
          {storeInfo.map(info => (
            <div key={info.label} className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${info.color}`}>
                {info.icon}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 mb-0.5">{info.label}</p>
                <p className="text-sm font-medium text-gray-900">{info.value}</p>
              </div>
            </div>
          ))}

          {/* Map placeholder */}
          <div className="bg-gray-100 border border-gray-200 rounded-xl h-48 flex items-center justify-center">
            <div className="text-center">
              <MapPin size={24} className="text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Map will be displayed here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
