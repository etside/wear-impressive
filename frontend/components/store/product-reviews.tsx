'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, MessageCircleReply, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reviewsApi } from '@/lib/api/services/customer';
import { customerAuthApi } from '@/lib/api/services/customer-auth';
import { getApiErrorMessage } from '@/lib/api/client';
import { useLang } from '@/lib/i18n/context';
import type { Review } from '@/lib/api/types';

const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
const toBnDigits = (s: string) => s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

interface ReviewsSummary {
  count: number;
  average: number;
  distribution?: Record<'1' | '2' | '3' | '4' | '5', number>;
}

/**
 * Public reviews block for the product detail page. Pure client component —
 * fetches its own data so themes can drop it in without prop wiring.
 *
 * Behaviour:
 *   - Lists approved reviews (already fetched by the parent page).
 *   - If the authenticated customer is eligible (delivered order, no prior
 *     review), shows a write-a-review form.
 *   - Vendor replies appear inline under each review.
 */
export function ProductReviews({
  productId,
  reviews,
  summary,
}: {
  productId: number;
  reviews: Review[];
  summary: ReviewsSummary;
}) {
  const qc = useQueryClient();
  const { t } = useLang();
  const r = t.productReviews;

  // Customer auth + eligibility.
  const meQuery = useQuery({
    queryKey: ['customer', 'me'],
    queryFn: () => customerAuthApi.me(),
    retry: false,
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('etommerce_customer_token'),
  });
  const customer = meQuery.data?.customer;

  const eligibilityQuery = useQuery({
    queryKey: ['customer', 'review-eligibility', productId],
    queryFn: () => reviewsApi.eligibility(productId),
    enabled: !!customer,
  });
  const eligibility = eligibilityQuery.data;

  return (
    <section className="border-t border-gray-200 pt-10 mt-10">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">{r.heading}</h2>
      <ReviewSummary summary={summary} />

      {customer && eligibility?.eligible && (
        <WriteReviewForm
          productId={productId}
          orderId={eligibility.order_id}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['customer', 'review-eligibility', productId] });
            qc.invalidateQueries({ queryKey: ['storefront', 'product'] });
          }}
        />
      )}
      {customer && eligibility && !eligibility.eligible && (
        <EligibilityNotice eligibility={eligibility} />
      )}
      {!customer && (
        <p className="mt-4 text-xs text-gray-500">
          <a href="/account/login" className="text-blue-600 hover:underline">{r.signIn}</a>{' '}
          {r.signInToReview}
        </p>
      )}

      <div className="mt-8 space-y-5">
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-500">{r.noReviewsYet}</p>
        ) : (
          reviews.map((rev) => <ReviewItem key={rev.id} review={rev} />)
        )}
      </div>
    </section>
  );
}

/* ── Summary ── */

function ReviewSummary({ summary }: { summary: ReviewsSummary }) {
  const { t, lang } = useLang();
  const r = t.productReviews;
  if (summary.count === 0) {
    return <p className="text-sm text-gray-500 mb-4">{r.noRatings}</p>;
  }
  const avgRaw = summary.average.toFixed(1);
  const avg = lang === 'bn' ? toBnDigits(avgRaw) : avgRaw;
  const countRaw = String(summary.count);
  const count = lang === 'bn' ? toBnDigits(countRaw) : countRaw;
  const word = summary.count === 1 ? r.reviewSingular : r.reviewPlural;
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-3xl font-bold text-gray-900">{avg}</span>
      <Stars value={summary.average} size={16} />
      <span className="text-sm text-gray-500">
        ({count} {word})
      </span>
    </div>
  );
}

/* ── Star renderer ── */

function Stars({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  const interactive = typeof onChange === 'function';
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value >= n;
        const halfFilled = !filled && value >= n - 0.5;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange?.(n)}
            disabled={!interactive}
            className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
            aria-label={`${n} stars`}
          >
            <Star
              size={size}
              className={filled ? 'text-amber-400 fill-amber-400' : halfFilled ? 'text-amber-400' : 'text-gray-300'}
            />
          </button>
        );
      })}
    </div>
  );
}

/* ── Single review ── */

function ReviewItem({ review }: { review: Review }) {
  const { t } = useLang();
  const r = t.productReviews;
  const author = review.customer?.name ?? r.anonymous;
  const initials = author.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  const date = new Date(review.created_at).toLocaleDateString();

  return (
    <article className="border border-gray-100 rounded-xl p-4 bg-white">
      <header className="flex items-start gap-3 mb-2">
        <div className="w-9 h-9 rounded-full bg-gray-900 text-white text-xs font-semibold flex items-center justify-center shrink-0">
          {initials || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{author}</p>
            {review.is_verified_purchase && (
              <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                <CheckCircle2 size={10} /> {r.verifiedPurchase}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Stars value={review.rating} size={12} />
            <span className="text-[11px] text-gray-400">{date}</span>
          </div>
        </div>
      </header>
      {review.title && <p className="text-sm font-semibold text-gray-900 mt-2">{review.title}</p>}
      {review.content && (
        <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{review.content}</p>
      )}

      {review.reply_text && (
        <div className="mt-3 ml-6 border-l-2 border-gray-200 pl-4 py-2 bg-gray-50 rounded-r-lg">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <MessageCircleReply size={12} /> {r.storeResponse}
            {review.reply_at && (
              <span className="text-[10px] text-gray-400 font-normal">
                · {new Date(review.reply_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{review.reply_text}</p>
        </div>
      )}
    </article>
  );
}

/* ── Write-a-review form ── */

function WriteReviewForm({
  productId, orderId, onSuccess,
}: {
  productId: number;
  orderId: number | null;
  onSuccess: () => void;
}) {
  const { t } = useLang();
  const r = t.productReviews;
  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);

  const submitMut = useMutation({
    mutationFn: () => reviewsApi.create({
      product_id: productId,
      order_id: orderId,
      rating,
      title: title.trim() || null,
      content: content.trim(),
    }),
    onSuccess: () => {
      setSuccess(true);
      setOpen(false);
      onSuccess();
      setRating(5); setTitle(''); setContent('');
    },
    onError: (err) => setError(getApiErrorMessage(err, r.submitFailed)),
  });

  if (success) {
    return (
      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-start gap-2">
        <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
        <span>{r.thanks}</span>
      </div>
    );
  }

  return (
    <div className="mt-5">
      {!open ? (
        <Button size="sm" onClick={() => setOpen(true)}>
          <Star size={13} /> {r.writeReview}
        </Button>
      ) : (
        <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">{r.rateProduct}</h3>

          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">{r.yourRating}</label>
            <Stars value={rating} size={22} onChange={setRating} />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">{r.titleOptional}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder={r.titlePlaceholder}
              className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">{r.yourReview}</label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={r.reviewPlaceholder}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:border-gray-400 outline-none resize-y"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>{r.cancel}</Button>
            <Button size="sm" onClick={() => submitMut.mutate()} disabled={!content.trim() || submitMut.isPending}>
              {submitMut.isPending ? r.submitting : r.submitReview}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EligibilityNotice({ eligibility }: { eligibility: { reason: string | null; existing_review: Review | null } }) {
  const { t } = useLang();
  const tr = t.productReviews;
  if (eligibility.reason === 'already_reviewed' && eligibility.existing_review) {
    const ex = eligibility.existing_review;
    return (
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        <p className="font-medium">{tr.alreadyReviewed}</p>
        <p className="mt-1">
          {tr.status}{' '}
          <strong>{ex.is_approved ? tr.approved : tr.pending}</strong>
        </p>
      </div>
    );
  }
  if (eligibility.reason === 'no_delivered_order') {
    return (
      <p className="mt-4 text-xs text-gray-500">
        {tr.onlyDelivered}
      </p>
    );
  }
  return null;
}
