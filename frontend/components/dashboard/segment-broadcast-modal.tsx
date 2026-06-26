'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Mail, MessageSquare, Send, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { segmentsApi } from '@/lib/api/services/vendor-customers';
import { getApiErrorMessage } from '@/lib/api/client';
import type { CustomerSegment } from '@/lib/api/types';

export function SegmentBroadcastModal({
  segment, channel, onClose,
}: {
  segment: CustomerSegment;
  channel: 'email' | 'sms';
  onClose: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ recipients: number } | null>(null);

  const sendMutation = useMutation({
    mutationFn: () => segmentsApi.broadcast(segment.id, {
      channel,
      subject: channel === 'email' ? subject.trim() : undefined,
      body: body.trim(),
    }),
    onSuccess: (r) => { setResult(r); setError(null); },
    onError: (err) => setError(getApiErrorMessage(err, 'Failed to send broadcast')),
  });

  const title = channel === 'email' ? 'Send email' : 'Send SMS';
  const Icon = channel === 'email' ? Mail : MessageSquare;

  const smsLength = body.trim().length;
  const smsChunks = Math.ceil(smsLength / 160) || 0;
  const canSend =
    !sendMutation.isPending &&
    body.trim().length > 0 &&
    (channel === 'email' ? subject.trim().length > 0 : true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Icon size={16} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">{title} — {segment.name}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
              <p className="font-medium mb-1">Queued for delivery</p>
              <p className="text-xs">
                {result.recipients} customer{result.recipients === 1 ? '' : 's'} will receive this {channel === 'email' ? 'email' : 'SMS'}.
                {channel === 'sms' && ' SMS will deliver once an SMS provider is configured in Settings.'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500">
                This will be sent to <strong>{segment.customer_count}</strong> customer{segment.customer_count === 1 ? '' : 's'} in this segment.
                Members without a valid {channel === 'email' ? 'email address' : 'phone number'} will be skipped.
              </p>

              {channel === 'email' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. New Size L stock just landed"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Message *
                  {channel === 'sms' && smsLength > 0 && (
                    <span className="ml-2 text-[10px] text-gray-400 font-normal">
                      {smsLength} chars · {smsChunks} SMS
                    </span>
                  )}
                </label>
                <textarea
                  rows={channel === 'sms' ? 4 : 8}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={channel === 'email'
                    ? 'Hi there, we just restocked...'
                    : 'Restock alert: Size L is back in stock. Shop now: wearimpressive.com'}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none resize-none font-mono"
                />
                {channel === 'email' && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Plain text. A formatted template wrapper is applied automatically.
                  </p>
                )}
                {channel === 'sms' && smsChunks > 1 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    This message is longer than 160 characters and will be billed as {smsChunks} SMS per recipient.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
          {result ? (
            <Button size="sm" onClick={onClose}>Done</Button>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={() => sendMutation.mutate()} disabled={!canSend}>
                <Send size={13} />
                {sendMutation.isPending ? 'Sending...' : channel === 'email' ? 'Send email' : 'Send SMS'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
