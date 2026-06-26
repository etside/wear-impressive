'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Star, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

import { useShopBase } from '@/lib/use-shop-base';
import { Price } from '@/lib/format-price';
import { Button } from '@/components/ui/button';
import { useLang } from '@/lib/i18n/context';
import { loyaltyApi, type LoyaltyTransaction } from '@/lib/api/services/customer';

const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
const toBnDigits = (s: string) => s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

function txnIcon(tr: LoyaltyTransaction) {
  if (tr.points > 0) return <ArrowUpRight size={14} className="text-green-600" />;
  if (tr.points < 0) return <ArrowDownRight size={14} className="text-red-600" />;
  return <Minus size={14} className="text-gray-400" />;
}

export default function AccountLoyaltyPage() {
  const __sb = useShopBase();
  const { t, lang } = useLang();
  const l = t.accountLoyalty;
  const fmtNum = (n: number) => (lang === 'bn' ? toBnDigits(n.toLocaleString()) : n.toLocaleString());

  const txnLabel = (tr: LoyaltyTransaction): string => {
    if (tr.type === 'earn') return l.txnEarned;
    if (tr.type === 'redeem') return l.txnRedeemed;
    return l.txnAdjustment;
  };

  const loyaltyQuery = useQuery({
    queryKey: ['customer', 'loyalty'],
    queryFn: () => loyaltyApi.show(),
  });

  const data = loyaltyQuery.data;
  const config = data?.config;
  const account = data?.account;
  const txns = data?.transactions ?? [];

  const programActive = !!config?.is_active;
  const balance = account?.balance ?? 0;
  const earned = account?.total_earned ?? 0;
  const redeemed = account?.total_redeemed ?? 0;

  const spendForOne = config ? Number(config.spend_amount_for_points) : 100;
  const pointsPerSpend = config?.points_per_spend ?? 1;
  const redemptionValue = config ? Number(config.redemption_value) : 1;
  const minRedeem = config?.min_redemption_points ?? 50;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-base lg:text-lg font-semibold text-gray-900">{l.heading}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{l.subheading}</p>
      </div>

      {loyaltyQuery.isLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-12 text-center text-sm text-gray-400">
          {l.loading}
        </div>
      ) : !programActive ? (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-12 text-center">
          <Star size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">{l.notEnabled}</p>
        </div>
      ) : (
        <>
          {/* Balance hero */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-700 text-white rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1 opacity-80">
              <Star size={14} />
              <span className="text-xs font-medium uppercase tracking-wider">{l.availableBalance}</span>
            </div>
            <p className="text-4xl font-bold">{fmtNum(balance)}</p>
            <p className="text-sm opacity-80 mt-1">
              {l.worthAtCheckout}<Price value={balance * redemptionValue} /> {l.atCheckout}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2 text-green-600">
                <TrendingUp size={14} />
                <span className="text-xs font-medium">{l.totalEarned}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{fmtNum(earned)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2 text-red-600">
                <TrendingDown size={14} />
                <span className="text-xs font-medium">{l.totalRedeemed}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{fmtNum(redeemed)}</p>
            </div>
          </div>

          {/* Earn rules */}
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{l.howItWorks}</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 shrink-0" />
                <span>
                  {l.earnRule} <b className="text-gray-900">{fmtNum(pointsPerSpend)} {pointsPerSpend === 1 ? l.pointSingular : l.pointPlural}</b>
                  {' '}{l.forEvery} <Price value={spendForOne} /> {l.youSpend}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 shrink-0" />
                <span>
                  {l.eachPointWorth} <Price value={redemptionValue} /> {l.atCheckoutPeriod}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 shrink-0" />
                <span>
                  {l.minRedemption} <b className="text-gray-900">{fmtNum(minRedeem)} {l.pointPlural}</b>.
                </span>
              </li>
              {config?.points_expiry_days && (
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 shrink-0" />
                  <span>{l.pointsExpire} {fmtNum(config.points_expiry_days)} {l.days}</span>
                </li>
              )}
            </ul>
            <div className="mt-4">
              <Link href={`${__sb}/products`}>
                <Button size="sm">{l.shopAndEarn}</Button>
              </Link>
            </div>
          </section>

          {/* Transactions */}
          <section className="bg-white border border-gray-200 rounded-xl">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">{l.recentActivity}</h3>
            </div>
            {txns.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {txns.map((tr) => (
                  <div key={tr.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      {txnIcon(tr)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{txnLabel(tr)}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{tr.reason ?? '—'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm font-semibold ${
                          tr.points > 0 ? 'text-green-600' : tr.points < 0 ? 'text-red-600' : 'text-gray-700'
                        }`}
                      >
                        {tr.points > 0 ? '+' : ''}{fmtNum(Math.abs(tr.points)) === fmtNum(0) ? fmtNum(tr.points) : (tr.points < 0 ? '-' : '') + fmtNum(Math.abs(tr.points))}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(tr.created_at).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-12 text-center text-sm text-gray-500">
                {l.noActivity}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
