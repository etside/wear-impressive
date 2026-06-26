"use client";
import { useShopBase } from '@/lib/use-shop-base';
import { Price } from '@/lib/format-price';
import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { CreditCard, Smartphone, Banknote, User, Truck, Wallet, Copy, Upload, Check as CheckIcon, Building2, QrCode, X } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  getSortedDistricts,
  getThanasWithAreas,
  getAreasForThana,
  getPostalCodeForArea,
} from "@/lib/bangladesh-locations";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { cartApi, checkoutApi, paymentApi, publicCheckoutFieldsApi } from "@/lib/api/services/storefront";
import { useMetaPixel } from "@/components/store/meta-pixel-provider";
import { addressesApi } from "@/lib/api/services/customer";
import { customerAuthApi } from "@/lib/api/services/customer-auth";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Cart, CartItem } from "@/lib/api/types";

const paymentIcons: Record<string, React.ReactNode> = {
  bkash:  <Smartphone size={18} className="text-green-600" />,
  nagad:  <Smartphone size={18} className="text-orange-500" />,
  ssl:    <CreditCard size={18} className="text-blue-600" />,
  card:   <CreditCard size={18} className="text-blue-600" />,
  cod:    <Banknote size={18} className="text-gray-600" />,
  cash:   <Banknote size={18} className="text-gray-600" />,
  manual: <Smartphone size={18} className="text-pink-600" />,
};

interface ManualChannel {
  id: string;
  type: 'mfs' | 'bank' | 'qr';
  name: string;
  /** MFS + Bank channels. */
  account_number?: string | null;
  /** Bank-only fields. */
  account_name?: string | null;
  bank_name?: string | null;
  branch_name?: string | null;
  account_type?: 'current' | 'savings' | null;
  /** QR-only field. */
  qr_image_url?: string | null;
}

interface ManualWalletSettings {
  /** New shape — vendor-managed list of payment channels. */
  channels?: ManualChannel[];
  /** Legacy shape — kept for older deployments still running unbumped storefront. */
  wallets?: Partial<Record<'bkash' | 'nagad' | 'rocket', string>>;
  action_label?: string | null;
  instructions?: string | null;
}

export default function CheckoutPage() {
  const __sb = useShopBase();


  const { t, lang } = useLang();
  const { track, config: pixelConfig } = useMetaPixel();
  const c = t.checkout;
  // Shortcut to the per-field strings; English fallbacks live here too so the
  // form stays bilingual without depending on vendor-side checkout config.
  const f = c.form;
  const router = useRouter();
  const qc = useQueryClient();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("bkash");
  const [shippingRateId, setShippingRateId] = useState<number | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  // Division is no longer collected from the form — derived server-side from
  // district when a courier needs it. The state is kept (defaulted to Dhaka)
  // so existing API contracts that include `division` keep round-tripping.
  const [division] = useState("Dhaka");
  const [district, setDistrict] = useState("");
  const [thana, setThana] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  // `area` was previously the thana field (free-text); it now holds the
  // sub-area within a thana (e.g. "Mirpur 11" inside Mirpur). Saved
  // addresses still round-trip the legacy meaning unchanged.
  const [area, setArea] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [notes, setNotes] = useState("");
  const [fullName, setFullName] = useState('');

  const [submitError, setSubmitError] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  // "Create an account with these details" toggle for guest checkout. When
  // ON, we add a password field and lazily check whether the entered phone
  // already has an account on this store — if yes, we show an inline notice
  // pointing the customer at sign-in. The actual account creation happens
  // as part of the place-order flow (register first → place order under
  // the new token), so failures abort cleanly without orphan orders.
  const [wantsAccount, setWantsAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [accountPasswordTouched, setAccountPasswordTouched] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);

  // Manual (bKash/Nagad/Rocket) payment state
  // Holds the id of the manual payment channel the customer picked. It used
  // to be a fixed enum (bkash/nagad/rocket) but now matches whatever id the
  // vendor's saved channel uses (e.g. "ch_abc123" or a legacy short code).
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [txnId, setTxnId] = useState('');
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofError, setProofError] = useState('');
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);

  /* ── Cart ─────────────────────────────────────────────────────── */
  const cartQuery = useQuery({
    queryKey: ['storefront', 'cart'],
    queryFn: () => cartApi.show(),
  });
  const cart: Cart | undefined = cartQuery.data;
  const cartItems: CartItem[] = cart?.items ?? [];

  // Fire InitiateCheckout once when cart loads with items
  useEffect(() => {
    if (cartItems.length > 0 && pixelConfig?.track_initiate_checkout) {
      track('InitiateCheckout', {
        content_ids: cartItems.map(i => String(i.product_id)),
        num_items: cartItems.reduce((s, i) => s + (i.quantity ?? 1), 0),
        value: parseFloat(cart?.total ?? '0') || 0,
        currency: 'BDT',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems.length > 0]);

  const [customerTokenExists, setCustomerTokenExists] = useState(false);
  useEffect(() => {
    setCustomerTokenExists(!!localStorage.getItem('etommerce_customer_token'));
  }, []);

  /* ── Customer (if authed) ─────────────────────────────────────── */
  const meQuery = useQuery({
    queryKey: ['customer', 'me'],
    queryFn: () => customerAuthApi.me(),
    retry: false,
    enabled: customerTokenExists,
  });
  const customer = meQuery.data?.customer;

  /* ── Addresses (if authed) ────────────────────────────────────── */
  const addressesQuery = useQuery({
    queryKey: ['customer', 'addresses'],
    queryFn: () => addressesApi.list(),
    enabled: !!customer,
  });
  const addresses = addressesQuery.data ?? [];

  // Prefill contact fields from customer profile.
  useEffect(() => {
    if (customer) {
      const parts = customer.name?.split(' ') || [];
      if (!firstName && parts[0]) setFirstName(parts[0]);
      if (!lastName && parts.length > 1) setLastName(parts.slice(1).join(' '));
      if (!fullName && customer.name) setFullName(customer.name);
      if (!email && customer.email) setEmail(customer.email);
      if (!phone && customer.phone) setPhone(customer.phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  /* ── Vendor-configurable checkout fields + name_mode ──────────── */
  const fieldsQuery = useQuery({
    queryKey: ['storefront', 'checkout-fields'],
    queryFn: () => publicCheckoutFieldsApi.config(),
    staleTime: 60_000,
  });
  const nameMode = fieldsQuery.data?.name_mode ?? 'split';

  const resolvedFullName = nameMode === 'full'
    ? fullName.trim()
    : `${firstName} ${lastName}`.trim();

  const shippingAddressPayload = useMemo(() => ({
    full_name: resolvedFullName,
    phone,
    email,
    division,
    district,
    thana,
    area,
    postal_code: postalCode,
    address_line_1: addressLine,
  }), [resolvedFullName, phone, email, division, district, thana, area, postalCode, addressLine]);

  const calcQuery = useQuery({
    queryKey: ['storefront', 'checkout', 'calc', {
      address_id: selectedAddressId,
      shipping_rate_id: shippingRateId,
      payment_method: paymentMethod,
      coupon_code: cart?.coupon_code ?? null,
      division, district,
    }],
    queryFn: () => checkoutApi.calculate({
      address_id: selectedAddressId,
      shipping_address: selectedAddressId ? undefined : shippingAddressPayload,
      shipping_rate_id: shippingRateId,
      payment_method: paymentMethod,
      coupon_code: cart?.coupon_code ?? null,
    }),
    enabled: cartItems.length > 0,
  });

  const calc = calcQuery.data;

  // Auto-select the first available shipping rate when quote loads.
  useEffect(() => {
    if (shippingRateId == null && calc?.available_shipping_rates && calc.available_shipping_rates.length > 0) {
      const first = calc.available_shipping_rates[0];
      if (first.id != null) setShippingRateId(first.id);
    }
  }, [calc?.available_shipping_rates, shippingRateId]);

  const availableShippingRates = calc?.available_shipping_rates ?? [];
  const availablePaymentMethods = calc?.available_payment_methods ?? [];

  // Auto-select the first available payment method when the list loads or
  // changes. This ensures the customer always has a valid selection,
  // especially when the advance policy filters out COD.
  useEffect(() => {
    if (availablePaymentMethods.length === 0) return;
    const currentIsValid = availablePaymentMethods.some(
      pm => (pm.key ?? pm.provider) === paymentMethod
    );
    if (!currentIsValid) {
      setPaymentMethod(availablePaymentMethods[0].key ?? availablePaymentMethods[0].provider ?? 'manual');
    }
  }, [availablePaymentMethods, paymentMethod]);

  /* ── Place order ──────────────────────────────────────────────── */
  const placeMutation = useMutation({
    mutationFn: async () => {
      // If the guest opted to create an account, register first so the order
      // is placed under the authed customer. We deliberately do this *before*
      // calling /checkout/place so that on register failure (e.g. backend
      // race against the phone-exists check) we don't end up with a guest
      // order plus no account.
      if (!customer && wantsAccount) {
        try {
          await customerAuthApi.register({
            name: resolvedFullName,
            phone: phoneDigits,
            email: email.trim() ? email.trim() : undefined,
            password: accountPassword,
            password_confirmation: accountPassword,
          });
          // Make sure the customer-me cache reflects the new auth state so
          // /checkout/place picks up the Sanctum token via auth('customer').
          qc.invalidateQueries({ queryKey: ['customer', 'me'] });
        } catch (err) {
          throw new Error(getApiErrorMessage(err, f.accountCreateFailed));
        }
      }
      return checkoutApi.place({
        customer_id: customer?.id ?? null,
        address_id: selectedAddressId,
        // Always send guest_* with the form values. If the customer is authed,
        // the backend ignores them in favour of auth('customer')->user(); if
        // their cached token has gone stale, these still satisfy the validator.
        guest_email: email || customer?.email || null,
        guest_phone: phone || customer?.phone || null,
        guest_name: resolvedFullName || customer?.name || null,
        shipping_address: selectedAddressId ? { id: selectedAddressId } : shippingAddressPayload,
        shipping_rate_id: shippingRateId,
        payment_method: paymentMethod,
        payment_reference: paymentMethod === 'manual' ? txnId.trim() || null : null,
        payment_proof_url: paymentMethod === 'manual' ? proofUrl : null,
        payment_wallet: paymentMethod === 'manual' ? selectedWallet : null,
        coupon_code: cart?.coupon_code ?? null,
        notes: notes || null,
      });
    },
    onSuccess: async (order) => {
      qc.invalidateQueries({ queryKey: ['storefront', 'cart'] });
      const trackPhone = phone || customer?.phone || '';
      const trackQs = `?order=${order.order_number}${trackPhone ? `&phone=${encodeURIComponent(trackPhone)}` : ''}`;

      if (order.requires_payment) {
        try {
          const { redirect_url } = await paymentApi.initiate(order.order_id);
          window.location.href = redirect_url;
          return;
        } catch (err) {
          setSubmitError(getApiErrorMessage(err, f.gatewayError));
          router.push(`${__sb}/order-confirmation${trackQs}`);
          return;
        }
      }

      router.push(`${__sb}/order-confirmation${trackQs}`);
    },
    onError: (err) => setSubmitError(getApiErrorMessage(err, f.failedToPlace)),
  });

  // Parse bilingual error: backend sends "EN msg.|BN msg." for stock errors.
  const displayError = useMemo(() => {
    if (!submitError) return '';
    if (submitError.includes('|')) {
      const parts = submitError.split('|');
      return lang === 'bn' ? (parts[1] || parts[0]) : parts[0];
    }
    return submitError;
  }, [submitError, lang]);

  const subtotal = parseFloat(calc?.subtotal ?? cart?.subtotal ?? '0') || 0;
  const shipping = parseFloat(calc?.shipping_amount ?? cart?.shipping_amount ?? '0') || 0;
  const discount = parseFloat(calc?.discount_amount ?? cart?.discount_amount ?? '0') || 0;
  const tax = parseFloat(calc?.tax_amount ?? cart?.tax_amount ?? '0') || 0;
  const total = parseFloat(calc?.total ?? cart?.total ?? '0') || subtotal + shipping + tax - discount;
  // Advance-payment split returned by /checkout/calculate. Only meaningful
  // when payment_method is "manual" AND the vendor's policy is non-trivial;
  // for COD/online orders advance is 0/total respectively.
  const advanceAmount = parseFloat(calc?.advance_amount ?? '0') || 0;
  const codAmount = parseFloat(calc?.cod_amount ?? '0') || 0;
  const advanceMode = calc?.advance_mode ?? 'none';
  const showAdvanceSplit =
    paymentMethod === 'manual' &&
    advanceMode !== 'none' &&
    advanceAmount > 0;

  // Vendor-configurable checkout fields (requirement = required | optional | hidden).
  const fieldConfig = useMemo(() => {
    const out: Record<string, { label: string; placeholder: string | null; required: boolean; visible: boolean; isCustom: boolean }> = {};
    (fieldsQuery.data?.fields ?? []).forEach(fld => {
      out[fld.field_key] = {
        label: fld.label,
        placeholder: fld.placeholder,
        required: fld.requirement === 'required',
        visible: true,
        isCustom: !!fld.is_custom,
      };
    });
    return out;
  }, [fieldsQuery.data]);

  // For built-in fields (phone, email, division, etc.) the vendor's saved
  // label is single-language, so we prefer the bilingual i18n fallback to
  // keep BN customers seeing Bangla labels. Custom vendor-added fields
  // (`is_custom: true`) still use the vendor's label since we have no
  // translation for them.
  const cfg = (key: string, fallback: { label: string; placeholder: string; required?: boolean }) => {
    const entry = fieldConfig[key];
    const useVendorLabel = entry?.isCustom ?? false;
    return {
      label: useVendorLabel ? (entry?.label ?? fallback.label) : fallback.label,
      placeholder: useVendorLabel ? (entry?.placeholder ?? fallback.placeholder) : fallback.placeholder,
      required: entry?.required ?? (fallback.required ?? false),
      visible: fieldsQuery.data ? !!entry : true,
    };
  };

  // Bangladeshi mobile numbers: 11 digits starting with 01, second digit 3-9
  // (Grameenphone 013/017, Robi 016/018, Banglalink 014/019, Teletalk 015).
  // Strip dashes/spaces so customers can paste in either format.
  const phoneDigits = phone.replace(/\D/g, '');
  const phoneFormatValid = /^01[3-9]\d{8}$/.test(phoneDigits);
  const emailFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const phoneRequired = cfg('phone', { label: '', placeholder: '' }).required;
  const emailRequired = cfg('email', { label: '', placeholder: '' }).required;

  // Phone-exists check fires for any guest as soon as the phone hits 11
  // valid BD digits — independent of the "create an account" toggle, so
  // returning customers see the "Sign in instead" hint the moment they
  // type their own number. Debounced to ~350ms to avoid hammering the
  // backend per keystroke. Skipped entirely for already-signed-in customers.
  useEffect(() => {
    if (customer || !phoneFormatValid) {
      setPhoneExists(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await customerAuthApi.checkPhone(phoneDigits);
        if (!cancelled) setPhoneExists(!!res.exists);
      } catch { /* network noise — leave previous value */ }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [customer, phoneFormatValid, phoneDigits]);

  // If the customer's phone matches an existing account, automatically
  // un-tick the "create account" toggle — they should sign in, not create
  // a duplicate. This also prevents the password field from blocking the
  // place-order button.
  useEffect(() => {
    if (phoneExists && wantsAccount) setWantsAccount(false);
  }, [phoneExists, wantsAccount]);

  // The account-password field validates after the customer has touched it,
  // matching the phone/email pattern.
  const accountPasswordError = wantsAccount && accountPasswordTouched && accountPassword.length > 0 && accountPassword.length < 8
    ? f.passwordTooShort
    : '';

  // Validation messages — only surface after the field has been touched, so
  // the form doesn't shout at the customer before they've started typing.
  const phoneError = phoneTouched && phone.trim() !== '' && !phoneFormatValid
    ? f.phoneInvalid
    : phoneTouched && phoneRequired && !phone.trim()
      ? f.phoneRequired
      : '';
  const emailError = emailTouched && email.trim() !== '' && !emailFormatValid
    ? f.emailInvalid
    : emailTouched && emailRequired && !email.trim()
      ? f.emailRequired
      : '';

  const contactValid = !!selectedAddressId || (() => {
    const missing: string[] = [];
    const check = (key: string, value: string) => {
      if (cfg(key, { label: '', placeholder: '' }).required && !value.trim()) missing.push(key);
    };
    if (nameMode === 'full') {
      if (!resolvedFullName) missing.push('full_name');
    } else {
      check('first_name', firstName);
      check('last_name', lastName);
    }
    check('phone', phone);
    check('email', email);
    check('address_line_1', addressLine);
    check('area', area);
    check('district', district);
    check('division', division);
    if (missing.length > 0) return false;
    // Format checks — phone must be a valid BD number when required (or
    // entered), email must look like an email when required (or entered).
    if (phoneRequired || phone.trim() !== '') {
      if (!phoneFormatValid) return false;
    }
    if (emailRequired || email.trim() !== '') {
      if (!emailFormatValid) return false;
    }
    // When the customer asked us to create an account, require an 8-char
    // password and block submit if their phone already has an account on
    // this store (they'd hit a 422 otherwise).
    if (wantsAccount) {
      if (accountPassword.length < 8) return false;
      if (phoneExists) return false;
    }
    return true;
  })();

  const selectedPaymentMethod = availablePaymentMethods.find(pm => (pm.key ?? pm.provider) === paymentMethod);
  const manualPanel = (() => {
    if (!selectedPaymentMethod) return null;
    if ((selectedPaymentMethod.key ?? selectedPaymentMethod.provider) !== 'manual') return null;
    const settings = (selectedPaymentMethod.settings ?? {}) as ManualWalletSettings;

    // Prefer the new channels[] array; fall back to legacy `wallets` map for
    // older deployments. Legacy entries are converted to MFS channels so the
    // markup below only deals with one shape.
    let channels: ManualChannel[] = [];
    if (Array.isArray(settings.channels) && settings.channels.length > 0) {
      channels = settings.channels.filter((c) => !!c?.name);
    } else {
      const w = settings.wallets ?? {};
      const legacy: ManualChannel[] = [];
      for (const k of ['bkash', 'nagad', 'rocket'] as const) {
        const num = (w as Record<string, string | undefined>)[k]?.trim();
        if (!num) continue;
        legacy.push({
          id: k,
          type: 'mfs',
          name: k.charAt(0).toUpperCase() + k.slice(1),
          account_number: num,
        });
      }
      channels = legacy;
    }

    return {
      channels,
      actionLabel: (settings.action_label?.trim() || f.makePaymentTo),
      instructions: settings.instructions ?? null,
    };
  })();

  // Auto-pick the first channel when the manual method is selected.
  useEffect(() => {
    if (paymentMethod !== 'manual') return;
    if (!manualPanel || manualPanel.channels.length === 0) return;
    if (selectedWallet && manualPanel.channels.some((c) => c.id === selectedWallet)) return;
    setSelectedWallet(manualPanel.channels[0].id);
  }, [paymentMethod, manualPanel, selectedWallet]);

  const selectedChannel = manualPanel?.channels.find(c => c.id === selectedWallet);
  const manualValid = paymentMethod !== 'manual' || (!!selectedWallet && !!txnId.trim());
  const canPlaceOrder = contactValid && !!shippingRateId && !!paymentMethod && manualValid && !placeMutation.isPending;

  const handleProofUpload = async (file: File | undefined) => {
    if (!file) return;
    setProofError('');
    setProofUploading(true);
    try {
      const { url } = await checkoutApi.uploadProof(file);
      setProofUrl(url);
    } catch (err) {
      setProofError(getApiErrorMessage(err, f.proofUploadError));
    } finally {
      setProofUploading(false);
    }
  };

  const copyWallet = async (num: string) => {
    try {
      await navigator.clipboard.writeText(num);
      setCopiedWallet(num);
      setTimeout(() => setCopiedWallet(v => (v === num ? null : v)), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="container-app pt-12 pb-10">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">{f.title}</h1>

      {cartQuery.isLoading ? (
        <div className="text-center py-16 text-sm text-gray-400">{f.loadingCart}</div>
      ) : cartItems.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">{f.emptyCart}</p>
          <Link href={`${__sb}/products`}><Button>{f.browseProducts}</Button></Link>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Contact + Address */}
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <User size={16} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900">{f.contactAddress}</h2>
            </div>

            {!customer && (
              <div className="mb-5 flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{f.haveAccount}</p>
                  <p className="text-xs text-gray-500">{f.haveAccountDesc}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setShowLoginModal(true)}>{f.signIn}</Button>
              </div>
            )}

            {customer && addresses.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-medium text-gray-600 mb-2">{f.savedAddresses}</p>
                <div className="flex flex-col gap-2">
                  {addresses.map(addr => (
                    <button
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id === selectedAddressId ? null : addr.id)}
                      className={cn(
                        "text-left p-3 border-2 rounded-xl transition-colors",
                        selectedAddressId === addr.id ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-400"
                      )}
                    >
                      <p className="text-sm font-medium text-gray-900">{addr.label} · {addr.full_name}</p>
                      <p className="text-xs text-gray-500">{addr.address_line_1}, {addr.thana}, {addr.district}, {addr.division}</p>
                      <p className="text-xs text-gray-500">{addr.phone}</p>
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedAddressId(null)}
                    className={cn(
                      "text-left p-3 border-2 rounded-xl text-sm transition-colors",
                      selectedAddressId === null ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-400"
                    )}
                  >
                    {f.useNewAddress}
                  </button>
                </div>
              </div>
            )}

            {selectedAddressId === null && (() => {
              const firstNameCfg = cfg('first_name', { label: f.firstName, placeholder: f.firstNamePlaceholder, required: true });
              const lastNameCfg = cfg('last_name', { label: f.lastName, placeholder: f.lastNamePlaceholder, required: true });
              const phoneCfg = cfg('phone', { label: f.phone, placeholder: f.phonePlaceholder, required: true });
              const emailCfg = cfg('email', { label: f.email, placeholder: f.emailPlaceholder, required: false });
              const divisionCfg = cfg('division', { label: f.division, placeholder: f.divisionPlaceholder, required: true });
              const districtCfg = cfg('district', { label: f.district, placeholder: f.districtPlaceholder, required: true });
              const areaCfg = cfg('area', { label: f.area, placeholder: f.areaPlaceholder, required: true });
              const addressCfg = cfg('address_line_1', { label: f.addressLine, placeholder: f.addressLinePlaceholder, required: true });
              const notesCfg = cfg('notes', { label: f.notes, placeholder: f.notesPlaceholder, required: false });
              const suffix = (r: boolean) => r ? ' *' : ` (${f.optional})`;
              return (
              <div className="flex flex-col gap-4">
                {nameMode === 'full' ? (
                  <Input
                    label={`${f.fullName}${suffix(firstNameCfg.required || lastNameCfg.required)}`}
                    placeholder={f.fullNamePlaceholder}
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                  />
                ) : (
                  (firstNameCfg.visible || lastNameCfg.visible) && (
                    <div className="grid grid-cols-2 gap-3">
                      {firstNameCfg.visible && <Input label={firstNameCfg.label + suffix(firstNameCfg.required)} placeholder={firstNameCfg.placeholder ?? ''} value={firstName} onChange={e => setFirstName(e.target.value)} />}
                      {lastNameCfg.visible && <Input label={lastNameCfg.label + suffix(lastNameCfg.required)} placeholder={lastNameCfg.placeholder ?? ''} value={lastName} onChange={e => setLastName(e.target.value)} />}
                    </div>
                  )
                )}
                {phoneCfg.visible && (
                  <div>
                    <Input
                      label={phoneCfg.label + suffix(phoneCfg.required)}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={14}
                      placeholder={phoneCfg.placeholder ?? ''}
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      onBlur={() => setPhoneTouched(true)}
                      error={phoneError}
                    />
                    {/* Real-time "you already have an account" hint —
                        appears as soon as the phone-exists check resolves
                        for guests with a fully-typed BD number. */}
                    {!customer && phoneExists && phoneFormatValid && !phoneError && (
                      <p className="text-xs text-amber-700 mt-1.5 leading-snug">
                        {f.phoneAlreadyHasAccount}
                        <button
                          type="button"
                          onClick={() => setShowLoginModal(true)}
                          className="underline font-medium hover:text-amber-900"
                        >
                          {f.signInInstead}
                        </button>
                      </p>
                    )}
                  </div>
                )}
                {emailCfg.visible && (
                  <Input
                    label={emailCfg.label + suffix(emailCfg.required)}
                    type="email"
                    autoComplete="email"
                    placeholder={emailCfg.placeholder ?? ''}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    error={emailError}
                  />
                )}
                {/* Location hierarchy — single source of truth in
                    bangladesh-locations.ts. Division is no longer collected
                    (derivable from district), so the vendor's `division`
                    field-toggle is intentionally ignored. The same flag still
                    drives backward compat for any vendor that hadn't enabled
                    `district`. */}
                {(districtCfg.visible || divisionCfg.visible) && (() => {
                  const districtOptions = getSortedDistricts().map((d) => ({ value: d, label: d }));
                  const thanaOptions = getThanasWithAreas(district).map((tn) => ({ value: tn, label: tn }));
                  const areaList = getAreasForThana(district, thana);
                  const areaOptions = areaList.map((a) => ({ value: a.name, label: `${a.name} · ${a.postal_code}` }));
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <SearchableSelect
                        label={districtCfg.label + suffix(districtCfg.required)}
                        placeholder={f.districtPlaceholder ?? 'Dhaka'}
                        options={districtOptions}
                        value={district || null}
                        onChange={(v) => {
                          // Reset downstream when district changes — thana/area/postal
                          // belong to the previous district's hierarchy.
                          setDistrict(v);
                          setThana('');
                          setArea('');
                          setPostalCode('');
                        }}
                      />
                      <SearchableSelect
                        label={'Thana' + suffix(districtCfg.required)}
                        placeholder={district ? 'Select thana' : 'Pick a district first'}
                        options={thanaOptions}
                        value={thana || null}
                        onChange={(v) => {
                          setThana(v);
                          setArea('');
                          setPostalCode('');
                        }}
                        disabled={!district}
                      />
                      {areaCfg.visible && (
                        areaOptions.length > 0 ? (
                          <div className="sm:col-span-2">
                            <SearchableSelect
                              label={areaCfg.label + suffix(areaCfg.required)}
                              placeholder={thana ? 'Select area' : 'Pick a thana first'}
                              options={areaOptions}
                              value={area || null}
                              onChange={(v) => {
                                setArea(v);
                                const postal = getPostalCodeForArea(district, thana, v);
                                if (postal) setPostalCode(postal);
                              }}
                              disabled={!thana}
                            />
                          </div>
                        ) : (
                          // Rural thanas often have no mapped areas — fall
                          // back to free-text so the customer isn't blocked.
                          <div className="sm:col-span-2">
                            <Input
                              label={areaCfg.label + suffix(areaCfg.required)}
                              placeholder={areaCfg.placeholder ?? ''}
                              value={area}
                              onChange={(e) => setArea(e.target.value)}
                            />
                          </div>
                        )
                      )}
                      <div className="sm:col-span-2">
                        <Input
                          label={'Postal code'}
                          placeholder="1207"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          hint={area ? 'Auto-filled from area — edit if needed' : undefined}
                        />
                      </div>
                    </div>
                  );
                })()}
                {addressCfg.visible && <Input label={addressCfg.label + suffix(addressCfg.required)} placeholder={addressCfg.placeholder ?? ''} value={addressLine} onChange={e => setAddressLine(e.target.value)} />}
                {notesCfg.visible && (
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1.5">{notesCfg.label}{suffix(notesCfg.required)}</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder={notesCfg.placeholder ?? ''}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none resize-none focus:border-gray-400"
                    />
                  </div>
                )}
              </div>
            ); })()}

            {/* "Create an account with these details" — guest-only. We hide
                this entirely for signed-in customers and when the customer
                picked a saved address (in which case the form fields aren't
                visible anyway). */}
            {!customer && selectedAddressId === null && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wantsAccount}
                    onChange={(e) => setWantsAccount(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-black focus:ring-black/20"
                  />
                  <span className="text-sm text-gray-700 leading-snug">{f.createAccountToggle}</span>
                </label>

                {wantsAccount && (
                  <div className="mt-3 ml-6">
                    <Input
                      label={f.accountPasswordLabel}
                      type="password"
                      autoComplete="new-password"
                      placeholder={f.accountPasswordPlaceholder}
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      onBlur={() => setAccountPasswordTouched(true)}
                      hint={accountPasswordError ? undefined : f.accountPasswordHint}
                      error={accountPasswordError}
                    />
                    {phoneExists && phoneFormatValid && (
                      <p className="text-xs text-red-600 mt-2">
                        {f.phoneAlreadyHasAccount}
                        <button
                          type="button"
                          onClick={() => setShowLoginModal(true)}
                          className="underline font-medium hover:text-red-700"
                        >
                          {f.signInInstead}
                        </button>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Shipping */}
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Truck size={16} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900">{f.shipping}</h2>
            </div>
            {calcQuery.isLoading ? (
              <p className="text-sm text-gray-400">{f.loadingShipping}</p>
            ) : availableShippingRates.length === 0 ? (
              <p className="text-sm text-gray-400">{f.noShipping}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {availableShippingRates.map(rate => {
                  const rid = rate.id ?? 0;
                  const selected = shippingRateId === rid;
                  const amt = parseFloat(rate.amount) || 0;
                  // Vendor-managed bilingual labels — fall back to English if
                  // the BN translation is missing (vendors aren't forced to
                  // translate every zone).
                  const zoneName = (lang === 'bn' && rate.name_bn?.trim()) ? rate.name_bn : rate.name;
                  const zoneEstimate = (lang === 'bn' && rate.delivery_estimate_bn?.trim())
                    ? rate.delivery_estimate_bn
                    : rate.delivery_estimate;
                  return (
                    <button
                      key={rid}
                      onClick={() => setShippingRateId(rid)}
                      className={cn(
                        "flex items-center gap-3 p-4 border-2 rounded-xl text-left transition-colors",
                        selected ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-400"
                      )}
                    >
                      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", selected ? "border-black" : "border-gray-300")}>
                        {selected && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{zoneName}</p>
                        <p className="text-xs text-gray-500">
                          {zoneEstimate ?? (rate.type === 'flat' ? f.flatRate : rate.type)}
                          {rate.free_shipping_threshold && amt > 0 && (
                            <> · {f.freeOver} <Price value={parseFloat(rate.free_shipping_threshold)} /></>
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{amt === 0 ? f.free : <Price value={amt} />}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Payment */}
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={16} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900">{f.payment}</h2>
            </div>
            {availablePaymentMethods.length === 0 ? (
              <p className="text-sm text-gray-400">{f.noPaymentMethods}</p>
            ) : (
              <div className="flex flex-col gap-2 mb-4">
                {availablePaymentMethods.map(pm => {
                  const key = pm.key ?? pm.provider ?? 'other';
                  const label = pm.name ?? pm.display_name ?? key;
                  const isActive = paymentMethod === key;
                  return (
                    <div key={key} className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod(key)}
                        className={cn(
                          "flex items-center gap-3 p-4 border-2 rounded-xl text-left transition-colors",
                          isActive ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-400"
                        )}
                      >
                        <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", isActive ? "border-black" : "border-gray-300")}>
                          {isActive && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                        </div>
                        {paymentIcons[key] ?? <CreditCard size={18} className="text-gray-600" />}
                        <span className="text-sm font-medium text-gray-900">
                          {label}
                          {key === 'manual' && (
                            <span className="ml-1.5 text-xs font-normal text-gray-500">{f.manualPaymentSuffix}</span>
                          )}
                        </span>
                      </button>

                      {isActive && key === 'manual' && manualPanel && (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-2">
                          {manualPanel.channels.length === 0 ? (
                            <p className="text-xs text-gray-500">{f.noChannels}</p>
                          ) : (
                            <>
                              {showAdvanceSplit && (
                                <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                                  <p className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide mb-2">
                                    {advanceMode === 'full' ? 'মোট পরিশোধযোগ্য' : f.paymentBreakdown}
                                  </p>
                                  <div className="flex justify-between text-sm text-amber-900">
                                    <span>
                                      {advanceMode === 'full' ? f.payNowMfs : f.payNowMfs}
                                      {advanceMode === 'delivery_charge' && <> ({f.advanceModeShipping})</>}
                                      {advanceMode === 'percentage' && <> ({f.advanceModePartial})</>}
                                      {advanceMode === 'full' && <> ({f.advanceModeFull})</>}
                                    </span>
                                    <span className="font-semibold"><Price value={advanceAmount} /></span>
                                  </div>
                                  {codAmount > 0 && (
                                    <div className="flex justify-between text-sm text-amber-900 mt-1">
                                      <span>{f.payOnDelivery}</span>
                                      <span className="font-semibold"><Price value={codAmount} /></span>
                                    </div>
                                  )}
                                </div>
                              )}
                              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">{manualPanel.actionLabel}</p>
                              <div className="flex flex-col gap-2 mb-3">
                                {manualPanel.channels.map((channel) => {
                                  const active = selectedWallet === channel.id;
                                  return (
                                    <ChannelOption
                                      key={channel.id}
                                      channel={channel}
                                      active={active}
                                      copied={copiedWallet}
                                      onSelect={() => setSelectedWallet(channel.id)}
                                      onCopy={(value) => copyWallet(value)}
                                    />
                                  );
                                })}
                              </div>

                              {manualPanel.instructions && (
                                <p className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg p-3 mb-3 whitespace-pre-line">
                                  {manualPanel.instructions}
                                </p>
                              )}

                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="block text-sm font-medium text-gray-800">
                                    {selectedChannel ? 'ট্রান্সঅ্যাকশন আইডি অথবা একাউন্ট নম্বরের শেষ ৪ সংখ্যা *' : `${f.txnId} *`}
                                  </label>
                                  {showAdvanceSplit && (
                                    <span className="text-sm font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                                      <Price value={advanceAmount} />
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  placeholder={f.txnIdPlaceholder}
                                  value={txnId}
                                  onChange={e => setTxnId(e.target.value)}
                                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
                                />
                              </div>

                              <div className="mt-3">
                                <label className="block text-sm font-medium text-gray-800 mb-1.5">{f.paymentScreenshot} <span className="text-gray-400 font-normal">(যদি থাকে)</span></label>
                                <div className="flex items-center gap-3">
                                  <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-white text-sm text-gray-700">
                                    <Upload size={14} />
                                    {proofUploading ? f.uploading : proofUrl ? f.replaceScreenshot : f.uploadScreenshot}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      disabled={proofUploading}
                                      onChange={e => handleProofUpload(e.target.files?.[0])}
                                    />
                                  </label>
                                  {proofUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={proofUrl} alt="Payment proof" className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                                  )}
                                </div>
                                {proofError && <p className="text-xs text-red-500 mt-1">{proofError}</p>}
                                <p className="text-[11px] text-gray-500 mt-1">{f.screenshotHint}</p>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {submitError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600">{displayError}</p>
              </div>
            )}

            <Button
              fullWidth
              size="lg"
              onClick={() => { setSubmitError(""); placeMutation.mutate(); }}
              disabled={!canPlaceOrder}
            >
              {placeMutation.isPending
                ? f.placingOrder
                : showAdvanceSplit
                  ? <>{f.placeOrderPayNow} <Price value={advanceAmount} /> {f.payNow}</>
                  : <>{f.placeOrderTotal} <Price value={total} /></>}
            </Button>
            {!contactValid && (
              <p className="text-xs text-gray-400 text-center mt-2">{f.fillRequired}</p>
            )}
          </section>
        </div>

        {/* Order Summary Sidebar */}
        <div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-24">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">{c.summary}</h2>
            <div className="flex flex-col gap-3 mb-4">
              {cartItems.map(item => {
                const price = parseFloat(item.price) || 0;
                const isBundle = !!item.is_bundle;
                return (
                  <div key={item.id ?? item.product_id} className="flex gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg shrink-0 relative overflow-hidden">
                      {item.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" />
                      )}
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{item.quantity}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <p className="text-xs font-medium text-gray-900 truncate">{item.product_name}</p>
                        {isBundle && (
                          <span className="inline-flex items-center text-[8px] font-semibold bg-[#2596be]/10 text-[#2596be] px-1 py-0.5 rounded">
                            BUNDLE
                          </span>
                        )}
                      </div>
                      {isBundle && item.components && item.components.length > 0 ? (
                        <ul className="mt-0.5 space-y-0.5">
                          {item.components.map(c => (
                            <li key={c.id} className="text-[10px] text-gray-500 truncate">
                              · {c.product_name}{c.variant_label ? ` (${c.variant_label})` : ''} ×{c.quantity}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        item.variant_label && <p className="text-[11px] text-gray-500">{item.variant_label}</p>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-gray-900 shrink-0"><Price value={price * (item.quantity ?? 1)} /></span>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-gray-100 pt-3 flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between text-gray-600"><span>{c.subtotal}</span><span><Price value={subtotal} /></span></div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600"><span>{f.discount}</span><span>-<Price value={discount} /></span></div>
              )}
              <div className="flex justify-between text-gray-600"><span>{c.shippingFee}</span><span><Price value={shipping} /></span></div>
              {tax > 0 && (
                <div className="flex justify-between text-gray-600"><span>{f.tax}</span><span><Price value={tax} /></span></div>
              )}
              <div className="flex justify-between font-semibold text-gray-900 mt-1 pt-1 border-t border-gray-100">
                <span>{c.total}</span><span><Price value={total} /></span>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            setShowLoginModal(false);
            qc.invalidateQueries({ queryKey: ['customer', 'me'] });
            qc.invalidateQueries({ queryKey: ['customer', 'addresses'] });
          }}
        />
      )}
    </div>
  );
}

/* ── Per-channel option in the manual payment list ────────────────── */
function ChannelOption({
  channel, active, copied, onSelect, onCopy,
}: {
  channel: ManualChannel;
  active: boolean;
  copied: string | null;
  onSelect: () => void;
  onCopy: (value: string) => void;
}) {
  const { t } = useLang();
  const f = t.checkout.form;
  const [qrOpen, setQrOpen] = useState(false);
  const Icon = channel.type === 'bank' ? Building2 : channel.type === 'qr' ? QrCode : Smartphone;

  return (
    <>
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex flex-col gap-2 p-3 border-2 rounded-lg transition-colors text-left bg-white',
        active ? 'border-black' : 'border-gray-200 hover:border-gray-400',
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0', active ? 'border-black' : 'border-gray-300')}>
          {active && <span className="w-2 h-2 bg-black rounded-full" />}
        </span>
        <Icon size={16} className="text-gray-500 shrink-0" />
        <span className="text-sm font-medium text-gray-900 flex-1">{channel.name}</span>
      </div>

      {/* MFS — short, single line under the header */}
      {channel.type === 'mfs' && channel.account_number && (
        <div className="flex items-center gap-3 pl-7">
          <span className="text-sm font-mono text-gray-700 flex-1 break-all">{channel.account_number}</span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onCopy(channel.account_number!); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onCopy(channel.account_number!); } }}
            className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 cursor-pointer shrink-0"
          >
            {copied === channel.account_number ? <CheckIcon size={12} /> : <Copy size={12} />}
            {copied === channel.account_number ? f.copied : f.copy}
          </span>
        </div>
      )}

      {/* Bank — labelled grid of details. Shown whether the row is active or
          not, since the customer may need to copy fields without clicking. */}
      {channel.type === 'bank' && (
        <div className="pl-7 grid grid-cols-[110px_1fr_auto] gap-x-3 gap-y-1 text-xs">
          {channel.account_name && (
            <>
              <span className="text-gray-500">{f.accountName}</span>
              <span className="text-gray-900 font-medium break-all">{channel.account_name}</span>
              <span />
            </>
          )}
          {channel.account_number && (
            <>
              <span className="text-gray-500">{f.accountNumber}</span>
              <span className="text-gray-900 font-mono break-all">{channel.account_number}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onCopy(channel.account_number!); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onCopy(channel.account_number!); } }}
                className="text-gray-500 hover:text-gray-900 flex items-center gap-1 cursor-pointer"
              >
                {copied === channel.account_number ? <CheckIcon size={12} /> : <Copy size={12} />}
                {copied === channel.account_number ? f.copied : f.copy}
              </span>
            </>
          )}
          {channel.bank_name && (
            <>
              <span className="text-gray-500">{f.bankName}</span>
              <span className="text-gray-900 break-all">{channel.bank_name}</span>
              <span />
            </>
          )}
          {channel.branch_name && (
            <>
              <span className="text-gray-500">{f.branchName}</span>
              <span className="text-gray-900 break-all">{channel.branch_name}</span>
              <span />
            </>
          )}
          {channel.account_type && (
            <>
              <span className="text-gray-500">{f.accountType}</span>
              <span className="text-gray-900 capitalize">{channel.account_type}</span>
              <span />
            </>
          )}
        </div>
      )}

      {/* QR — only show the image when this row is active, otherwise the list
          gets very tall on stores with several QR codes. */}
      {channel.type === 'qr' && channel.qr_image_url && active && (
        <div className="pl-7 flex flex-col items-start gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={channel.qr_image_url}
            alt={`${channel.name} QR code`}
            className="w-44 h-44 object-contain border border-gray-200 rounded-lg bg-white cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setQrOpen(true); }}
          />
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); setQrOpen(true); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setQrOpen(true); } }}
            className="text-xs text-[#2596be] hover:underline cursor-pointer"
          >
            বড় করে দেখুন
          </span>
        </div>
      )}
    </button>

    {/* QR full-size modal */}
    {qrOpen && channel.qr_image_url && typeof document !== 'undefined' && createPortal(
      <div
        className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4"
        onClick={() => setQrOpen(false)}
      >
        <div
          className="relative bg-white rounded-xl p-4 max-w-sm w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setQrOpen(false)}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-900"
          >
            <X size={20} />
          </button>
          <p className="text-sm font-medium text-gray-900 mb-3 pr-8">{channel.name} QR Code</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={channel.qr_image_url}
            alt={`${channel.name} QR code`}
            className="w-full object-contain rounded-lg"
          />
        </div>
      </div>,
      document.body
    )}
    </>
  );
}

function LoginModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const __sb = useShopBase();
  const { t } = useLang();
  const f = t.checkout.form;
  const a = t.storeAuth;

  // Mobile-first by default but lets the customer flip to email login —
  // some accounts (existing email-only users) wouldn't otherwise be able
  // to sign in once we removed the email field.
  const [mode, setMode] = useState<'mobile' | 'email'>('mobile');
  const [phone, setPhone] = useState('');
  const phoneDigits = phone.replace(/\D/g, '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const loginMut = useMutation({
    mutationFn: () => customerAuthApi.login(
      mode === 'mobile'
        ? { phone: phoneDigits, password }
        : { email: email.trim(), password }
    ),
    onSuccess,
    onError: (e) => setErr(getApiErrorMessage(e, f.invalidCreds)),
  });

  const canSubmit = (mode === 'mobile' ? !!phoneDigits : !!email.trim()) && !!password;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">{f.signInTitle}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); setErr(''); loginMut.mutate(); }}
          className="p-5 space-y-3"
        >
          {err && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{err}</div>}

          {/* Mobile / Email toggle */}
          <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('mobile')}
              className={`py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === 'mobile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {a.tabMobile}
            </button>
            <button
              type="button"
              onClick={() => setMode('email')}
              className={`py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {a.tabEmail}
            </button>
          </div>

          {mode === 'mobile' ? (
            <Input
              label={f.phone}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={14}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={f.phonePlaceholder}
              required
            />
          ) : (
            <Input
              label={f.email}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={f.emailPlaceholder}
              required
            />
          )}

          <Input label={f.password} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" fullWidth size="sm" disabled={loginMut.isPending || !canSubmit}>
            {loginMut.isPending ? f.signingIn : f.signInBtn}
          </Button>
          <div className="flex items-center justify-between pt-1 text-xs">
            <Link href={`${__sb}/account/forgot-password`} className="text-gray-500 hover:text-gray-900">{f.forgotPassword}</Link>
            <Link href={`${__sb}/account/register`} className="text-gray-500 hover:text-gray-900">{f.createAccount}</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
