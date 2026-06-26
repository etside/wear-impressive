/**
 * TypeScript types matching Laravel backend model structure.
 * These mirror the Eloquent models in `backend/app/Models/`.
 */

export interface Store {
  id: number;
  name: string;
  handle: string;
  custom_domain: string | null;
  email: string;
  phone: string | null;
  country: string;
  currency: string;
  timezone: string;
  primary_language: 'en' | 'bn' | 'both';
  logo: string | null;
  favicon: string | null;
  description: string | null;
  address_line_1: string | null;
  division: string | null;
  district: string | null;
  thana: string | null;
  postal_code: string | null;
  status: 'active' | 'suspended';
  plan: string;
  trial_ends_at: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
  billing_overrides?: {
    cycle_months: number | null;
    custom_price: number | null;
    custom_mrr: number | null;
  };
}

export interface Vendor {
  id: number;
  store_id: number;
  email: string;
  phone: string | null;
  name: string;
  avatar: string | null;
  role: string;
  email_verified_at: string | null;
  phone_verified_at: string | null;
  last_login_at: string | null;
  store?: Store;
  onboarding_progress?: OnboardingProgress;
}

export interface Customer {
  id: number;
  store_id: number;
  email: string | null;
  phone: string | null;
  name: string;
  avatar: string | null;
  date_of_birth: string | null;
  gender: string | null;
  total_spent: string;
  total_orders: number;
  loyalty_points: number;
  notes: string | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
  last_order_at: string | null;
  created_at: string;
  addresses?: CustomerAddress[];
}

export interface CustomerAddress {
  id: number;
  customer_id: number;
  label: string;
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string | null;
  division: string;
  district: string;
  thana: string;
  area: string | null;
  postal_code: string | null;
  is_default: boolean;
}

export interface Staff {
  id: number;
  store_id: number;
  email: string | null;
  phone: string | null;
  name: string;
  avatar: string | null;
  role: string;
  permissions: string[] | null;
  branch_ids: number[] | null;
  active: boolean;
  accepted_at: string | null;
  last_login_at: string | null;
}

export interface OnboardingProgress {
  id: number;
  store_id: number;
  step_store_details: boolean;
  step_logo: boolean;
  step_first_product: boolean;
  step_shipping: boolean;
  step_payments: boolean;
  step_theme: boolean;
  step_launch: boolean;
  completed_at: string | null;
}

export interface Product {
  id: number;
  store_id: number;
  vendor_id: number;
  category_id: number;
  sub_category_id: number | null;
  brand_id: number | null;
  product_type: 'physical' | 'digital' | 'bundle';
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  /** Vendor-defined extra tabs rendered after the Description on the product page. */
  custom_tabs: Array<{
    name_en: string;
    name_bn?: string | null;
    content_en?: string | null;
    content_bn?: string | null;
  }> | null;
  price: string;
  discount: string | null;
  discount_type: 'flat' | 'percent' | null;
  cost_price: string | null;
  sku: string | null;
  barcode: string | null;
  weight_value: string | null;
  weight_unit: 'g' | 'kg' | 'lb' | 'oz';
  has_variants: boolean;
  track_inventory: boolean;
  stock: number;
  low_stock_threshold: number;
  images: string[];
  featured_image: string | null;
  cover_image: string | null;
  tags: string[];
  meta_title: string | null;
  meta_description: string | null;
  url_handle: string | null;
  status: 'draft' | 'active' | 'archived';
  digital_file_path: string | null;
  digital_file_name: string | null;
  digital_file_size: number | null;
  download_limit: number | null;
  download_expiry_days: number | null;
  external_url: string | null;
  /** Optional YouTube URL — surfaces a "Watch Video" button on the product page. */
  video_url: string | null;
  /** Optional YouTube URL — surfaces a "Size Guide" link on the product page. */
  size_guide_url: string | null;
  is_taxable: boolean;
  tax_rate: string;
  published_at: string | null;
  created_at: string;
  variants?: ProductVariant[];
  category?: ProductCategory;
  brand?: Brand;
  /** Bundle pricing fields — only populated when product_type='bundle'. */
  bundle_pricing_strategy?: 'sum' | 'fixed' | 'percent' | null;
  bundle_price?: string | null;
  bundle_discount_percent?: string | null;
  bundle_compare_at_price?: string | null;
  bundle_components?: ProductBundleComponent[];
}

export interface ProductBundleComponent {
  id: number;
  bundle_product_id: number;
  component_product_id: number;
  quantity: number;
  sort_order: number;
  is_required: boolean;
  component?: Product;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  sku: string | null;
  barcode: string | null;
  options: Record<string, string>;
  price: string;
  discount: string | null;
  discount_type: 'flat' | 'percent' | null;
  cost_price: string | null;
  stock: number;
  image: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface ProductCategory {
  id: number;
  store_id: number | null;
  parent_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  icon_type: 'lucide' | 'upload' | null;
  icon_name: string | null;
  icon_url: string | null;
  image: string | null;
  sort_order: number;
  is_active: boolean;
  /** Legacy alias — backend returns `products_count` from withCount(). */
  product_count?: number;
  products_count?: number;
  /** Count of products filed under this category via sub_category_id. */
  sub_category_products_count?: number;
  children?: ProductCategory[];
}

export interface Brand {
  id: number;
  store_id: number | null;
  category_id: number | null;
  sub_category_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  logo_type: 'lucide' | 'upload' | null;
  logo_name: string | null;
  logo_url: string | null;
  website: string | null;
  featured: boolean;
  is_active: boolean;
  product_count?: number;
  products_count?: number;
}

export interface Order {
  id: number;
  store_id: number;
  order_number: string;
  customer_id: number | null;
  customer_address_id: number | null;
  branch_id: number | null;
  guest_email: string | null;
  guest_phone: string | null;
  guest_name: string | null;
  status: 'pending' | 'confirmed' | 'processing' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'refunded' | 'returned';
  payment_status: 'pending' | 'paid' | 'partial' | 'failed' | 'refunded';
  fulfillment_status: 'unfulfilled' | 'partial' | 'fulfilled';
  subtotal: string;
  discount_amount: string;
  shipping_amount: string;
  tax_amount: string;
  total: string;
  /** Frozen advance/COD split (null on legacy orders pre-feature). */
  advance_amount: string | null;
  cod_amount: string | null;
  /** Running total of money received against the order. Updated by the
   *  `verifyAdvance`, `collectCod`, and `markAsPaid` actions. */
  amount_paid: string;
  /** Backend-computed accessors. `amount_outstanding = total - amount_paid`. */
  amount_outstanding?: number;
  is_advance_settled?: boolean;
  is_fully_paid?: boolean;
  currency: string;
  payment_method: string | null;
  payment_reference: string | null;
  coupon_code: string | null;
  notes: string | null;
  internal_notes: string | null;
  shipping_address: Record<string, unknown> | null;
  billing_address: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  created_at: string;
  items?: OrderItem[];
  customer?: Customer;
  fulfillments?: OrderFulfillment[];
  timeline?: OrderTimelineEntry[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  variant_id: number | null;
  product_name: string;
  variant_label: string | null;
  sku: string | null;
  image: string | null;
  price: string;
  discount: string;
  tax_rate: string;
  quantity: number;
  quantity_fulfilled: number;
  quantity_returned: number;
  subtotal: string;
  total: string;
  product?: Product;
  variant?: ProductVariant;
}

export interface OrderFulfillment {
  id: number;
  order_id: number;
  tracking_number: string | null;
  carrier: string | null;
  tracking_url: string | null;
  status: 'pending' | 'packed' | 'shipped' | 'in_transit' | 'delivered' | 'failed';
  shipped_at: string | null;
  delivered_at: string | null;
  estimated_delivery: string | null;
  cod_amount: string;
  notes: string | null;
}

export interface OrderTimelineEntry {
  id: number;
  order_id: number;
  event_type: string;
  title: string;
  description: string | null;
  user_type: string | null;
  user_id: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AuthResponse {
  vendor?: Vendor;
  customer?: Customer;
  staff?: Staff;
  store?: Store;
  onboarding?: OnboardingProgress;
  token: string;
  token_type: string;
}

/* ── Additional domain types ──────────────────────────────────────────── */

export interface Collection {
  id: number;
  store_id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  type: 'manual' | 'automatic';
  conditions: Record<string, unknown> | null;
  is_active: boolean;
  product_count?: number;
  products_count?: number;
  created_at: string;
  updated_at: string;
  products?: Product[];
}

export interface Return {
  id: number;
  order_id: number;
  return_number: string;
  status: 'requested' | 'approved' | 'rejected' | 'received' | 'refunded' | 'cancelled';
  reason: string | null;
  notes: string | null;
  refund_amount: string;
  refund_method: string | null;
  refunded_at: string | null;
  items?: ReturnItem[];
  order?: Order;
  created_at: string;
}

export interface ReturnItem {
  id: number;
  return_id: number;
  order_item_id: number;
  quantity: number;
  reason: string | null;
  condition: string | null;
}

export interface AbandonedCart {
  id: number;
  store_id: number;
  customer_id: number | null;
  session_id: string | null;
  email: string | null;
  phone: string | null;
  items: Record<string, unknown>[];
  subtotal: string;
  recovery_sent_at: string | null;
  recovered_at: string | null;
  created_at: string;
}

export interface CustomerSegment {
  id: number;
  store_id: number;
  name: string;
  description: string | null;
  conditions: Record<string, unknown>;
  condition_match?: 'all' | 'any' | null;
  is_system?: boolean;
  icon?: string | null;
  color?: string | null;
  customer_count: number;
  last_calculated_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: number;
  store_id: number;
  product_id: number;
  customer_id: number | null;
  order_id: number | null;
  rating: number;
  title: string | null;
  /** Backend stores this in the `content` column. */
  content: string | null;
  /** Legacy alias kept for code paths still reading `.body`. */
  body?: string | null;
  images?: string[] | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  approved_at: string | null;
  helpful_count: number;
  reply_text: string | null;
  reply_at: string | null;
  status?: 'pending' | 'approved' | 'rejected';
  created_at: string;
  product?: Product;
  customer?: Pick<Customer, 'id' | 'name' | 'avatar'>;
}

export interface Branch {
  id: number;
  store_id: number;
  name: string;
  code: string | null;
  address: string | null;
  division: string | null;
  district: string | null;
  thana: string | null;
  phone: string | null;
  email: string | null;
  is_main: boolean;
  is_active: boolean;
  created_at: string;
}

export interface InventoryLog {
  id: number;
  product_id: number;
  variant_id: number | null;
  branch_id: number;
  type: 'adjustment' | 'sale' | 'return' | 'transfer_in' | 'transfer_out' | 'purchase';
  quantity_before: number;
  quantity_change: number;
  quantity_after: number;
  reason: string | null;
  reference_type: string | null;
  reference_id: number | null;
  user_type: string | null;
  user_id: number | null;
  created_at: string;
}

export interface StockTransfer {
  id: number;
  store_id: number;
  transfer_number: string;
  from_branch_id: number;
  to_branch_id: number;
  status: 'draft' | 'sent' | 'received' | 'cancelled';
  sent_at: string | null;
  received_at: string | null;
  notes: string | null;
  items?: StockTransferItem[];
  created_at: string;
}

export interface StockTransferItem {
  id: number;
  stock_transfer_id: number;
  product_id: number;
  variant_id: number | null;
  quantity: number;
  quantity_received: number;
}

export interface Supplier {
  id: number;
  store_id: number;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PosTerminal {
  id: number;
  store_id: number;
  branch_id: number;
  name: string;
  code: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface PosSession {
  id: number;
  store_id: number;
  terminal_id: number;
  staff_id: number | null;
  vendor_id: number | null;
  opening_cash: string;
  closing_cash: string | null;
  expected_cash: string | null;
  cash_difference: string | null;
  total_sales: string;
  total_refunds: string;
  total_transactions: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
}

export interface PosSale {
  id: number;
  store_id: number;
  session_id: number;
  terminal_id: number;
  order_id: number | null;
  sale_number: string;
  customer_id: number | null;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total: string;
  amount_paid: string;
  change_given: string;
  payment_method: string;
  status: 'completed' | 'voided' | 'refunded';
  notes: string | null;
  items?: PosSaleItem[];
  created_at: string;
}

export interface PosSaleItem {
  id: number;
  pos_sale_id: number;
  product_id: number;
  variant_id: number | null;
  product_name: string;
  sku: string | null;
  price: string;
  discount: string;
  quantity: number;
  subtotal: string;
  total: string;
}

export interface PosCashMovement {
  id: number;
  session_id: number;
  type: 'in' | 'out';
  amount: string;
  reason: string | null;
  created_at: string;
}

export interface PurchaseOrder {
  id: number;
  store_id: number;
  po_number: string;
  supplier_id: number;
  branch_id: number;
  status: 'draft' | 'ordered' | 'partially_received' | 'received' | 'closed' | 'cancelled';
  ordered_at: string | null;
  expected_at: string | null;
  received_at: string | null;
  subtotal: string;
  tax_amount: string;
  shipping_amount: string;
  total: string;
  notes: string | null;
  items?: PurchaseOrderItem[];
  supplier?: Supplier;
  created_at: string;
}

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  product_id: number;
  variant_id: number | null;
  quantity: number;
  quantity_received: number;
  unit_cost: string;
  total: string;
}

export interface GiftCard {
  id: number;
  store_id: number;
  code: string;
  initial_value: string;
  current_balance: string;
  customer_id: number | null;
  status: 'active' | 'disabled' | 'redeemed' | 'expired';
  expires_at: string | null;
  note: string | null;
  created_at: string;
  customer?: Customer;
}

export interface BlogPost {
  id: number;
  store_id: number;
  category_id: number | null;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  featured_image: string | null;
  author_name: string | null;
  tags: string[];
  meta_title: string | null;
  meta_description: string | null;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  published_at: string | null;
  created_at: string;
  category?: BlogCategory;
}

export interface BlogCategory {
  id: number;
  store_id: number;
  name: string;
  slug: string;
  description: string | null;
  post_count: number;
  created_at: string;
}

export interface CmsPageAboutSections {
  hero?: { heading?: string; subheading?: string };
  story?: { heading?: string; paragraphs?: string[]; story_image?: string };
  stats?: Array<{ value: string; label: string }>;
  values?: Array<{ icon: string; title: string; description: string; color: string }>;
  team?: Array<{ name: string; role: string; initials: string }>;
  hours?: string;
}

export interface CmsPage {
  id: number;
  store_id: number;
  title: string;
  slug: string;
  content: string | null;
  body: string | null;
  sections: CmsPageAboutSections | null;
  meta_title: string | null;
  meta_description: string | null;
  status: 'draft' | 'published';
  template: string | null;
  published_at: string | null;
  created_at: string;
}

export interface NavigationMenu {
  id: number;
  store_id: number;
  name: string;
  handle: string;
  items: NavigationMenuItem[];
  created_at: string;
}

export interface NavigationMenuItem {
  id?: number;
  /** Legacy single-language label, retained for backward compat. */
  label: string;
  /** Bilingual labels — preferred. Storefront resolves by active lang. */
  label_en?: string | null;
  label_bn?: string | null;
  url: string;
  target?: '_self' | '_blank';
  type?: string;
  children?: NavigationMenuItem[];
}

export interface UrlRedirect {
  id: number;
  store_id: number;
  from_path: string;
  to_path: string;
  status_code: 301 | 302;
  hits: number;
  created_at: string;
}

export interface FileAsset {
  id: number;
  store_id: number;
  uploader_type: string | null;
  uploader_id: number | null;
  name: string;
  original_name: string;
  path: string;
  url: string;
  mime_type: string;
  size: number;
  alt: string | null;
  folder: string | null;
  created_at: string;
}

export interface Discount {
  id: number;
  store_id: number;
  code: string;
  name: string | null;
  description: string | null;
  type: 'percentage' | 'fixed' | 'free_shipping' | 'buy_x_get_y';
  value: string;
  minimum_amount: string | null;
  maximum_discount: string | null;
  applies_to: 'all' | 'products' | 'categories' | 'collections';
  applies_to_ids: number[] | null;
  customer_eligibility: 'all' | 'specific' | 'segment';
  customer_ids: number[] | null;
  usage_limit: number | null;
  usage_limit_per_customer: number | null;
  used_count: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface StoreSetting {
  key: string;
  value: string | number | boolean | Record<string, unknown> | unknown[] | null;
  group: string | null;
}

export interface CheckoutField {
  id: number;
  store_id: number;
  field_key: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox';
  placeholder: string | null;
  required: boolean;
  visible: boolean;
  sort_order: number;
  options: string[] | null;
}

export interface ShippingZone {
  id: number;
  store_id: number;
  name: string;
  /** Bangla translation of `name` — vendor-managed, falls back to `name`. */
  name_bn?: string | null;
  districts: string[] | null;
  coverage: Record<string, unknown> | null;
  flat_rate: string;
  free_shipping_threshold: string | null;
  delivery_estimate: string | null;
  /** Bangla translation of `delivery_estimate` — falls back to `delivery_estimate`. */
  delivery_estimate_bn?: string | null;
  is_active: boolean;
  created_at: string;
  // Legacy — kept so old callers don't explode.
  regions?: string[];
  rates?: ShippingRate[];
}

export interface ShippingRate {
  id?: number;
  name: string;
  /** Bangla translation of `name`. Falls back to `name` when empty. */
  name_bn?: string | null;
  type: 'flat' | 'weight_based' | 'price_based';
  amount: string;
  min_value?: string | null;
  max_value?: string | null;
  delivery_estimate?: string | null;
  /** Bangla translation of `delivery_estimate`. Falls back when empty. */
  delivery_estimate_bn?: string | null;
  free_shipping_threshold?: string | null;
}

export interface PaymentMethod {
  id: number;
  store_id: number;
  provider: 'sslcommerz' | 'bkash' | 'nagad' | 'cod' | 'stripe' | 'manual' | string;
  display_name: string;
  description: string | null;
  is_active: boolean;
  is_test_mode?: boolean;
  metadata: Record<string, unknown> | null;
  sort_order: number;
  // Legacy — kept to not break callers reading these fields.
  key?: string;
  name?: string;
  logo?: string | null;
  settings?: Record<string, unknown> | null;
}

export interface DeliveryPartner {
  id: number;
  store_id: number;
  provider: string;
  display_name: string;
  is_active: boolean;
  is_test_mode: boolean;
  credentials: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
}

export interface TaxRule {
  id: number;
  store_id: number;
  name: string;
  rate: string;
  region: string | null;
  applies_to: 'all' | 'shipping' | 'products';
  is_active: boolean;
  created_at: string;
}

export interface EmailTemplate {
  id: number;
  store_id: number;
  key: string;
  name: string;
  subject: string;
  body: string;
  is_active: boolean;
  is_default: boolean;
  updated_at: string;
}

export interface WishlistItem {
  id: number;
  customer_id: number;
  product_id: number;
  variant_id: number | null;
  created_at: string;
  product?: Product;
  variant?: ProductVariant;
}

export interface Cart {
  id: number | null;
  store_id: number;
  customer_id: number | null;
  session_id: string | null;
  items: CartItem[];
  subtotal: string;
  discount_amount: string;
  shipping_amount: string;
  tax_amount: string;
  total: string;
  coupon_code: string | null;
  currency: string;
}

export interface CartItem {
  id: number | null;
  product_id: number;
  variant_id: number | null;
  product_name: string;
  variant_label: string | null;
  sku: string | null;
  image: string | null;
  price: string;
  quantity: number;
  subtotal: string;
  total: string;
  product?: Product;
  variant?: ProductVariant;
  /** True when this is a bundle parent line. */
  is_bundle?: boolean;
  /** For bundle parents only — the chosen-variant child rows. */
  components?: Array<{
    id: number;
    product_id: number;
    variant_id: number | null;
    quantity: number;
    product_name: string;
    variant_label: string | null;
    image: string | null;
  }>;
}

export interface CheckoutCalculation {
  subtotal: string;
  discount_amount: string;
  shipping_amount: string;
  tax_amount: string;
  total: string;
  /** Amount the customer must prepay via the manual gateway. 0 for COD orders. */
  advance_amount?: string;
  /** Remainder collected by the courier on delivery. 0 for fully prepaid orders. */
  cod_amount?: string;
  /** Which advance-policy mode the split came from. */
  advance_mode?: 'none' | 'delivery_charge' | 'percentage' | 'full';
  /** The vendor's saved policy config (used for hint text on the checkout). */
  advance_policy?: {
    mode: 'none' | 'delivery_charge' | 'percentage' | 'full';
    percentage: number;
    round_to: number;
    floor: number;
  };
  currency: string;
  available_shipping_rates?: ShippingRate[];
  available_payment_methods?: PaymentMethod[];
}

/* ── Super Admin ──────────────────────────────────────────────────────── */

export interface SuperAdmin {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: string;
  price_yearly: string;
  features: string[];
  limits: Record<string, number | string | boolean | null>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlatformTopStore {
  id: number;
  name: string;
  handle: string;
  revenue: number | string;
}

export interface PlatformStats {
  total_stores: number;
  active_stores: number;
  suspended_stores: number;
  total_vendors: number;
  total_customers: number;
  total_orders: number;
  total_revenue: number | string;
  orders_last_30d: number;
  revenue_last_30d: number | string;
  top_stores: PlatformTopStore[];
  plan_distribution: Record<string, number>;
  new_stores_last_7d: number;
  mrr_estimate: number | string;
  sidebar_badges?: {
    stores?: number;
    vendors?: number;
    orders?: number;
    activity?: number;
  };
}

export interface ActivityLog {
  id: number;
  log_name: string | null;
  description: string;
  subject_type: string | null;
  subject_id: number | null;
  causer_type: string | null;
  causer_id: number | null;
  causer_name: string | null;
  store_id: number | null;
  properties: Record<string, unknown> | null;
  created_at: string;
}

/* ── Vendor Account Settings ──────────────────────────────────────────── */

export interface VendorSession {
  id: string;
  name: string;
  abilities: string[];
  last_used_at: string | null;
  created_at: string;
  is_current: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  abilities: string[];
  last_used_at: string | null;
  created_at: string;
}

export interface BillingInvoice {
  id: number | string;
  invoice_number: string;
  plan_slug: string;
  amount: string;
  currency: string;
  status: string;
  billing_period_start: string | null;
  billing_period_end: string | null;
  paid_at: string | null;
  created_at: string;
}

/* ── Vendor Dashboard Stats & Analytics ───────────────────────────────── */

export interface VendorStatsAlert {
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

export interface VendorStats {
  today_revenue: string;
  today_orders: number;
  pending_orders: number;
  low_stock_products: number;
  recent_orders: Order[];
  alerts: VendorStatsAlert[];
}

export interface AnalyticsRevenuePoint {
  date: string;
  revenue: number | string;
  orders: number;
}

export interface AnalyticsRevenueResponse {
  series: AnalyticsRevenuePoint[];
  total_revenue: number | string;
  total_orders: number;
  avg_order_value: number | string;
}

export interface AnalyticsTopProduct {
  id: number;
  name: string;
  qty_sold: number;
  revenue: number | string;
}

export interface AnalyticsTopCustomer {
  id: number;
  name: string;
  total_spent: number | string;
  orders_count: number;
}

export interface AnalyticsCustomersResponse {
  new_customers: number;
  returning_customers: number;
  top_customers: AnalyticsTopCustomer[];
}
