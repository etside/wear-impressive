<?php

use App\Http\Controllers\Api\Customer\AddressController as CustomerAddressController;
use App\Http\Controllers\Api\Customer\Auth\ForgotPasswordController as CustomerForgotPasswordController;
use App\Http\Controllers\Api\Customer\Auth\LoginController as CustomerLoginController;
use App\Http\Controllers\Api\Customer\Auth\LogoutController as CustomerLogoutController;
use App\Http\Controllers\Api\Customer\Auth\MeController as CustomerMeController;
use App\Http\Controllers\Api\Customer\Auth\CheckPhoneController as CustomerCheckPhoneController;
use App\Http\Controllers\Api\Customer\Auth\RegisterController as CustomerRegisterController;
use App\Http\Controllers\Api\Customer\Auth\ResetPasswordController as CustomerResetPasswordController;
use App\Http\Controllers\Api\Customer\LoyaltyController as CustomerLoyaltyController;
use App\Http\Controllers\Api\Customer\ReviewController as CustomerReviewController;
use App\Http\Controllers\Api\Customer\WishlistController as CustomerWishlistController;
use App\Http\Controllers\Api\Staff\Auth\AcceptInviteController as StaffAcceptInviteController;
use App\Http\Controllers\Api\Staff\Auth\LoginController as StaffLoginController;
use App\Http\Controllers\Api\Staff\Auth\LogoutController as StaffLogoutController;
use App\Http\Controllers\Api\Staff\Auth\MeController as StaffMeController;
use App\Http\Controllers\Api\Storefront\BlogController as StorefrontBlogController;
use App\Http\Controllers\Api\Storefront\BrandController as StorefrontBrandController;
use App\Http\Controllers\Api\Storefront\CartController as StorefrontCartController;
use App\Http\Controllers\Api\Storefront\CheckoutController as StorefrontCheckoutController;
use App\Http\Controllers\Api\Storefront\CmsPageController as StorefrontCmsPageController;
use App\Http\Controllers\Api\Storefront\CollectionController as StorefrontCollectionController;
use App\Http\Controllers\Api\Storefront\ContactController as StorefrontContactController;
use App\Http\Controllers\Api\Storefront\CheckoutFieldController as StorefrontCheckoutFieldController;
use App\Http\Controllers\Api\Storefront\PaymentController as StorefrontPaymentController;
use App\Http\Controllers\Api\Webhook\CourierWebhookController;
use App\Http\Controllers\Api\Webhook\PaymentWebhookController;
use App\Http\Controllers\Api\Storefront\OrderController as StorefrontOrderController;
use App\Http\Controllers\Api\Storefront\ProductCategoryController as StorefrontCategoryController;
use App\Http\Controllers\Api\Storefront\ProductController as StorefrontProductController;
use App\Http\Controllers\Api\Storefront\StoreInfoController as StorefrontInfoController;
use App\Http\Controllers\Api\Vendor\AbandonedCartController;
use App\Http\Controllers\Api\Vendor\AnalyticsController as VendorAnalyticsController;
use App\Http\Controllers\Api\Vendor\Auth\ForgotPasswordController as VendorForgotPasswordController;
use App\Http\Controllers\Api\Vendor\Auth\LoginController as VendorLoginController;
use App\Http\Controllers\Api\Vendor\Auth\LogoutController as VendorLogoutController;
use App\Http\Controllers\Api\Vendor\Auth\MeController as VendorMeController;
use App\Http\Controllers\Api\Vendor\Auth\ResetPasswordController as VendorResetPasswordController;
use App\Http\Controllers\Api\Vendor\BlogCategoryController as VendorBlogCategoryController;
use App\Http\Controllers\Api\Vendor\BlogPostController as VendorBlogPostController;
use App\Http\Controllers\Api\Vendor\BranchController as VendorBranchController;
use App\Http\Controllers\Api\Vendor\BranchStockController as VendorBranchStockController;
use App\Http\Controllers\Api\Vendor\BrandController as VendorBrandController;
use App\Http\Controllers\Api\Vendor\CmsPageController as VendorCmsPageController;
use App\Http\Controllers\Api\Vendor\CollectionController as VendorCollectionController;
use App\Http\Controllers\Api\Vendor\ContactMessageController as VendorContactMessageController;
use App\Http\Controllers\Api\Vendor\CourierController as VendorCourierController;
use App\Http\Controllers\Api\Vendor\CustomerController as VendorCustomerController;
use App\Http\Controllers\Api\Vendor\CustomerSegmentController as VendorCustomerSegmentController;
use App\Http\Controllers\Api\Vendor\DiscountController as VendorDiscountController;
use App\Http\Controllers\Api\Vendor\FileController as VendorFileController;
use App\Http\Controllers\Api\Vendor\InventoryLogController as VendorInventoryLogController;
use App\Http\Controllers\Api\Vendor\LoyaltyController as VendorLoyaltyController;
use App\Http\Controllers\Api\Vendor\NavigationMenuController as VendorNavigationMenuController;
use App\Http\Controllers\Api\Vendor\OrderController;
use App\Http\Controllers\Api\Vendor\OrderFulfillmentController;
use App\Http\Controllers\Api\Vendor\ProductCategoryController as VendorProductCategoryController;
use App\Http\Controllers\Api\Vendor\ProductController as VendorProductController;
use App\Http\Controllers\Api\Vendor\ProductReviewController as VendorProductReviewController;
use App\Http\Controllers\Api\Vendor\ProductVariantController as VendorProductVariantController;
use App\Http\Controllers\Api\Vendor\ReturnRequestController;
use App\Http\Controllers\Api\Vendor\StatsController as VendorStatsController;
use App\Http\Controllers\Api\Vendor\StaffController as VendorStaffController;
use App\Http\Controllers\Api\Vendor\Settings\MetaPixelController as VendorMetaPixelController;
use App\Http\Controllers\Api\Storefront\MetaPixelController as StorefrontMetaPixelController;
use App\Http\Controllers\Api\Vendor\Settings\GoogleTagManagerController as VendorGoogleTagManagerController;
use App\Http\Controllers\Api\Storefront\GoogleTagManagerController as StorefrontGoogleTagManagerController;
use App\Http\Controllers\Api\Vendor\Settings\BrandingController as VendorBrandingController;
use App\Http\Controllers\Api\Vendor\Settings\CheckoutFieldController as VendorCheckoutFieldController;
use App\Http\Controllers\Api\Vendor\Settings\DeliveryPartnerController as VendorDeliveryPartnerController;
use App\Http\Controllers\Api\Vendor\Settings\EmailTemplateController as VendorEmailTemplateController;
use App\Http\Controllers\Api\Vendor\Settings\GeneralSettingsController as VendorGeneralSettingsController;
use App\Http\Controllers\Api\Vendor\Settings\PaymentMethodController as VendorPaymentMethodController;
use App\Http\Controllers\Api\Vendor\Settings\SecurityController as VendorSecurityController;
use App\Http\Controllers\Api\Vendor\Settings\ShippingZoneController as VendorShippingZoneController;
use App\Http\Controllers\Api\Vendor\Settings\StoreSettingController as VendorStoreSettingController;
use App\Http\Controllers\Api\Vendor\Settings\TaxRuleController as VendorTaxRuleController;
use App\Http\Controllers\Api\Vendor\UrlRedirectController as VendorUrlRedirectController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Payment Gateway Webhooks
|--------------------------------------------------------------------------
|
| Declared BEFORE the vendor / storefront groups so they bypass store
| resolution + auth. Each route is guarded by VerifyPaymentWebhook which
| enforces a shared secret header when PAYMENTS_WEBHOOK_SECRET is set.
|
*/
Route::prefix('webhooks/payments')->group(function () {
    Route::match(['get', 'post'], 'sslcommerz', [PaymentWebhookController::class, 'sslcommerz'])
        ->middleware('verify.payment_webhook:sslcommerz')
        ->name('webhooks.payments.sslcommerz');

    Route::match(['get', 'post'], 'bkash', [PaymentWebhookController::class, 'bkash'])
        ->middleware('verify.payment_webhook:bkash')
        ->name('webhooks.payments.bkash');

    Route::match(['get', 'post'], 'nagad', [PaymentWebhookController::class, 'nagad'])
        ->middleware('verify.payment_webhook:nagad')
        ->name('webhooks.payments.nagad');
});

/*
|--------------------------------------------------------------------------
| Courier Webhooks
|--------------------------------------------------------------------------
|
| Public endpoints that couriers call to push tracking status updates.
| Each route is guarded by VerifyCourierWebhook which enforces an optional
| shared secret (query ?token= or X-Webhook-Token header). If no secret is
| configured the check is skipped for dev friendliness.
|
*/
Route::prefix('webhooks/couriers')->group(function () {
    Route::match(['get', 'post'], 'pathao', [CourierWebhookController::class, 'pathao'])
        ->middleware('verify.courier_webhook:pathao')
        ->name('webhooks.couriers.pathao');

    Route::match(['get', 'post'], 'steadfast', [CourierWebhookController::class, 'steadfast'])
        ->middleware('verify.courier_webhook:steadfast')
        ->name('webhooks.couriers.steadfast');

    Route::match(['get', 'post'], 'redx', [CourierWebhookController::class, 'redx'])
        ->middleware('verify.courier_webhook:redx')
        ->name('webhooks.couriers.redx');
});

/*
|--------------------------------------------------------------------------
| Vendor API
|--------------------------------------------------------------------------
*/
Route::prefix('vendor')->group(function () {
    // Public vendor auth (rate-limited to prevent brute force)
    Route::middleware('throttle:10,1')->group(function () {
        Route::post('login', VendorLoginController::class);
        Route::post('forgot-password', VendorForgotPasswordController::class);
        Route::post('reset-password', VendorResetPasswordController::class);
    });

    // Protected vendor
    Route::middleware(['auth:vendor', 'attach.store'])->group(function () {
        Route::post('logout', VendorLogoutController::class);
        Route::get('me', VendorMeController::class);

        // Dashboard stats + analytics
        Route::get('stats', [VendorStatsController::class, 'show'])->name('vendor.stats');
        Route::get('analytics/revenue', [VendorAnalyticsController::class, 'revenue'])->name('vendor.analytics.revenue');
        Route::get('analytics/top-products', [VendorAnalyticsController::class, 'topProducts'])->name('vendor.analytics.top_products');
        Route::get('analytics/customers', [VendorAnalyticsController::class, 'customers'])->name('vendor.analytics.customers');
        Route::get('analytics/profit', [VendorAnalyticsController::class, 'profit'])->name('vendor.analytics.profit');
        Route::get('analytics/payments', [VendorAnalyticsController::class, 'paymentReport'])->name('vendor.analytics.payments');

        // Loyalty engine
        Route::get('loyalty/config', [VendorLoyaltyController::class, 'showConfig'])->name('vendor.loyalty.config.show');
        Route::patch('loyalty/config', [VendorLoyaltyController::class, 'updateConfig'])->name('vendor.loyalty.config.update');
        Route::get('loyalty/accounts', [VendorLoyaltyController::class, 'indexAccounts'])->name('vendor.loyalty.accounts.index');
        Route::get('loyalty/accounts/{customer_id}', [VendorLoyaltyController::class, 'showAccount'])
            ->whereNumber('customer_id')
            ->name('vendor.loyalty.accounts.show');
        Route::post('loyalty/accounts/{customer_id}/adjust', [VendorLoyaltyController::class, 'adjust'])
            ->whereNumber('customer_id')
            ->name('vendor.loyalty.accounts.adjust');

        // Orders — bulk action first so it does not collide with /orders/{order}
        Route::post('orders/bulk-action', [OrderController::class, 'bulkAction']);
        Route::get('orders', [OrderController::class, 'index']);
        Route::post('orders', [OrderController::class, 'store']);
        Route::get('orders/{order}', [OrderController::class, 'show']);
        Route::patch('orders/{order}', [OrderController::class, 'update']);
        Route::post('orders/{order}/cancel', [OrderController::class, 'cancel']);
        Route::post('orders/{order}/confirm', [OrderController::class, 'markAsConfirmed']);
        Route::post('orders/{order}/pack', [OrderController::class, 'markAsPacked']);
        Route::post('orders/{order}/ship', [OrderController::class, 'markAsShipped']);
        Route::post('orders/{order}/deliver', [OrderController::class, 'markAsDelivered']);
        Route::post('orders/{order}/mark-paid', [OrderController::class, 'markAsPaid']);
        Route::post('orders/{order}/verify-advance', [OrderController::class, 'verifyAdvance']);
        Route::post('orders/{order}/collect-cod', [OrderController::class, 'collectCod']);
        Route::post('orders/{order}/notes', [OrderController::class, 'addNote']);
        Route::get('orders/{order}/timeline', [OrderController::class, 'timeline']);

        // Order fulfillments (nested)
        Route::get('orders/{order}/fulfillments/{fulfillment}', [OrderFulfillmentController::class, 'show']);
        Route::post('orders/{order}/fulfillments', [OrderFulfillmentController::class, 'store']);
        Route::patch('orders/{order}/fulfillments/{fulfillment}', [OrderFulfillmentController::class, 'update']);

        // Courier integrations (nested under fulfillments)
        Route::post('orders/{order}/fulfillments/{fulfillment}/courier/book', [VendorCourierController::class, 'book']);
        Route::get('fulfillments/{fulfillment}/courier/track', [VendorCourierController::class, 'track']);
        Route::post('fulfillments/{fulfillment}/courier/cancel', [VendorCourierController::class, 'cancel']);

        // Returns
        Route::get('returns', [ReturnRequestController::class, 'index']);
        Route::get('returns/{return}', [ReturnRequestController::class, 'show']);
        Route::post('returns/{return}/approve', [ReturnRequestController::class, 'approve']);
        Route::post('returns/{return}/reject', [ReturnRequestController::class, 'reject']);
        Route::post('returns/{return}/received', [ReturnRequestController::class, 'markReceived']);
        Route::post('returns/{return}/refund', [ReturnRequestController::class, 'processRefund']);

        // Abandoned carts — stats first to avoid /{cart} collision
        Route::get('abandoned-carts/stats', [AbandonedCartController::class, 'stats']);
        Route::get('abandoned-carts', [AbandonedCartController::class, 'index']);
        Route::get('abandoned-carts/{cart}', [AbandonedCartController::class, 'show']);
        Route::post('abandoned-carts/{cart}/send-recovery', [AbandonedCartController::class, 'sendRecovery']);

        // Products — specific actions first to avoid /{product} collisions
        Route::post('products/bulk-delete', [VendorProductController::class, 'bulkDelete']);
        Route::post('products/import', [VendorProductController::class, 'import']);
        Route::post('products/{product}/duplicate', [VendorProductController::class, 'duplicate']);

        // Product variants (nested)
        Route::post('products/{product}/variants', [VendorProductVariantController::class, 'store']);
        Route::put('products/{product}/variants/{variant}', [VendorProductVariantController::class, 'update']);
        Route::delete('products/{product}/variants/{variant}', [VendorProductVariantController::class, 'destroy']);

        // Product resource
        Route::get('products', [VendorProductController::class, 'index']);
        Route::post('products', [VendorProductController::class, 'store']);
        Route::get('products/{product}', [VendorProductController::class, 'show']);
        Route::put('products/{product}', [VendorProductController::class, 'update']);
        Route::patch('products/{product}', [VendorProductController::class, 'update']);
        Route::delete('products/{product}', [VendorProductController::class, 'destroy']);

        // Product categories — reorder first to avoid /{id} collision
        Route::post('product-categories/reorder', [VendorProductCategoryController::class, 'reorder']);
        Route::apiResource('product-categories', VendorProductCategoryController::class);

        // Brands
        Route::post('brands/{brand}/toggle-featured', [VendorBrandController::class, 'toggleFeatured']);
        Route::apiResource('brands', VendorBrandController::class);

        // Collections
        Route::post('collections/{collection}/products', [VendorCollectionController::class, 'addProducts']);
        Route::delete('collections/{collection}/products', [VendorCollectionController::class, 'removeProducts']);
        Route::apiResource('collections', VendorCollectionController::class);

        // Staff (invited team members for the current store)
        Route::get('staff', [VendorStaffController::class, 'index']);
        Route::post('staff', [VendorStaffController::class, 'invite']);
        Route::get('staff/{staff}', [VendorStaffController::class, 'show']);
        Route::patch('staff/{staff}', [VendorStaffController::class, 'update']);
        Route::delete('staff/{staff}', [VendorStaffController::class, 'destroy']);
        Route::post('staff/{staff}/resend-invite', [VendorStaffController::class, 'resendInvite']);

        // Customers — specific actions first to avoid /{customer} collisions
        Route::post('customers/import', [VendorCustomerController::class, 'import']);
        Route::post('customers/bulk-action', [VendorCustomerController::class, 'bulkAction']);
        Route::post('customers/{customer}/notes', [VendorCustomerController::class, 'addNote']);
        Route::get('customers/{customer}/orders', [VendorCustomerController::class, 'orders']);
        Route::apiResource('customers', VendorCustomerController::class);

        // Customer segments
        Route::get('customer-segments/attribute-options', [VendorCustomerSegmentController::class, 'attributeOptions']);
        Route::post('customer-segments/preview', [VendorCustomerSegmentController::class, 'preview']);
        Route::post('customer-segments/{customer_segment}/calculate', [VendorCustomerSegmentController::class, 'calculateMembers']);
        Route::post('customer-segments/{customer_segment}/broadcast', [VendorCustomerSegmentController::class, 'broadcast']);
        Route::get('customer-segments/{customer_segment}/customers', [VendorCustomerSegmentController::class, 'customers']);
        Route::apiResource('customer-segments', VendorCustomerSegmentController::class)
            ->parameters(['customer-segments' => 'customer_segment']);

        // Contact messages
        Route::get('contact-messages', [VendorContactMessageController::class, 'index']);
        Route::get('contact-messages/{message}', [VendorContactMessageController::class, 'show']);
        Route::patch('contact-messages/{message}', [VendorContactMessageController::class, 'update']);
        Route::delete('contact-messages/{message}', [VendorContactMessageController::class, 'destroy']);

        // Product reviews — stats first to avoid /{review} collision
        Route::get('reviews/stats', [VendorProductReviewController::class, 'stats']);
        Route::post('reviews/{review}/approve', [VendorProductReviewController::class, 'approve']);
        Route::post('reviews/{review}/reject', [VendorProductReviewController::class, 'reject']);
        Route::post('reviews/{review}/reply', [VendorProductReviewController::class, 'reply']);
        Route::apiResource('reviews', VendorProductReviewController::class)->only(['index', 'show']);

        // Blog — specific actions before resource routes
        Route::post('blog-posts/{blog_post}/publish', [VendorBlogPostController::class, 'publish']);
        Route::post('blog-posts/{blog_post}/unpublish', [VendorBlogPostController::class, 'unpublish']);
        Route::post('blog-posts/{blog_post}/toggle-featured', [VendorBlogPostController::class, 'toggleFeatured']);
        Route::apiResource('blog-posts', VendorBlogPostController::class)
            ->parameters(['blog-posts' => 'blog_post']);
        Route::apiResource('blog-categories', VendorBlogCategoryController::class)
            ->parameters(['blog-categories' => 'blog_category']);

        // CMS
        Route::post('cms-pages/{cms_page}/publish', [VendorCmsPageController::class, 'publish']);
        Route::post('cms-pages/{cms_page}/unpublish', [VendorCmsPageController::class, 'unpublish']);
        Route::apiResource('cms-pages', VendorCmsPageController::class)
            ->parameters(['cms-pages' => 'cms_page']);
        Route::apiResource('navigation-menus', VendorNavigationMenuController::class)
            ->parameters(['navigation-menus' => 'navigation_menu']);

        // URL redirects — import first to avoid /{url_redirect} collision
        Route::post('url-redirects/import', [VendorUrlRedirectController::class, 'import']);
        Route::apiResource('url-redirects', VendorUrlRedirectController::class)
            ->parameters(['url-redirects' => 'url_redirect']);

        // Files — bulk-delete first to avoid /{file} collision
        Route::post('files/bulk-delete', [VendorFileController::class, 'bulkDelete']);
        Route::apiResource('files', VendorFileController::class);

        // Discounts — specific actions (including /validate) before resource routes
        Route::post('discounts/validate', [VendorDiscountController::class, 'validate']);
        Route::post('discounts/{discount}/toggle-active', [VendorDiscountController::class, 'toggleActive']);
        Route::post('discounts/{discount}/duplicate', [VendorDiscountController::class, 'duplicate']);
        Route::apiResource('discounts', VendorDiscountController::class);

        // Branches (locations) — specific actions first to avoid /{branch} collisions
        Route::post('branches/{branch}/set-main', [VendorBranchController::class, 'setMain']);
        Route::get('branches/{branch}/stock', [VendorBranchStockController::class, 'index']);
        Route::post('branches/{branch}/stock/adjust', [VendorBranchStockController::class, 'adjust']);
        Route::apiResource('branches', VendorBranchController::class);

        // Inventory logs (read-only audit trail)
        Route::get('inventory-logs', [VendorInventoryLogController::class, 'index']);

        // Settings
        Route::prefix('settings')->group(function () {
            Route::get('/', [VendorStoreSettingController::class, 'index']);
            Route::put('/', [VendorStoreSettingController::class, 'update']);

            Route::get('general', [VendorGeneralSettingsController::class, 'show']);
            Route::patch('general', [VendorGeneralSettingsController::class, 'update']);

            Route::patch('branding', [VendorBrandingController::class, 'update']);

            Route::get('checkout-fields', [VendorCheckoutFieldController::class, 'index']);
            Route::put('checkout-fields', [VendorCheckoutFieldController::class, 'update']);

            Route::apiResource('shipping-zones', VendorShippingZoneController::class)
                ->parameters(['shipping-zones' => 'shipping_zone']);

            Route::apiResource('payment-methods', VendorPaymentMethodController::class)
                ->only(['index', 'update'])
                ->parameters(['payment-methods' => 'payment_method']);

            Route::apiResource('delivery-partners', VendorDeliveryPartnerController::class)
                ->only(['index', 'update'])
                ->parameters(['delivery-partners' => 'delivery_partner']);

            Route::apiResource('tax-rules', VendorTaxRuleController::class)
                ->parameters(['tax-rules' => 'tax_rule']);

            Route::get('email-templates', [VendorEmailTemplateController::class, 'index']);
            Route::put('email-templates/{template}', [VendorEmailTemplateController::class, 'update']);
            Route::post('email-templates/{template}/reset', [VendorEmailTemplateController::class, 'resetToDefault']);

            // Meta Pixel / Conversions API
            Route::get('meta-pixel', [VendorMetaPixelController::class, 'show']);
            Route::patch('meta-pixel', [VendorMetaPixelController::class, 'update']);
            Route::delete('meta-pixel/token', [VendorMetaPixelController::class, 'clearToken']);

            // Google Tag Manager
            Route::get('google-tag-manager', [VendorGoogleTagManagerController::class, 'show']);
            Route::patch('google-tag-manager', [VendorGoogleTagManagerController::class, 'update']);

            // Security (password + active sessions).
            Route::get('security/password', [VendorSecurityController::class, 'showPassword']);
            Route::post('security/password', [VendorSecurityController::class, 'updatePassword']);
            Route::get('security/sessions', [VendorSecurityController::class, 'listSessions']);
            Route::delete('security/sessions/{token}', [VendorSecurityController::class, 'revokeSession'])->whereNumber('token');
            Route::post('security/sessions/revoke-others', [VendorSecurityController::class, 'revokeOtherSessions']);
        });
    });
});

/*
|--------------------------------------------------------------------------
| Staff API
|--------------------------------------------------------------------------
*/
Route::prefix('staff')->group(function () {
    // Public staff auth (rate-limited)
    Route::middleware('throttle:10,1')->group(function () {
        Route::post('accept-invite', StaffAcceptInviteController::class);
        Route::post('login', StaffLoginController::class);
    });

    // Protected staff
    Route::middleware(['auth:staff', 'attach.store'])->group(function () {
        Route::post('logout', StaffLogoutController::class);
        Route::get('me', StaffMeController::class);
    });
});

/*
|--------------------------------------------------------------------------
| Customer API (requires store context via subdomain / custom domain)
|--------------------------------------------------------------------------
*/
Route::prefix('customer')->middleware(['resolve.store', 'store.context'])->group(function () {
    // Public customer auth (rate-limited, still needs a resolved store)
    Route::middleware('throttle:15,1')->group(function () {
        Route::post('register', CustomerRegisterController::class);
        Route::post('login', CustomerLoginController::class);
        Route::post('forgot-password', CustomerForgotPasswordController::class);
        Route::post('reset-password', CustomerResetPasswordController::class);
        Route::post('check-phone', CustomerCheckPhoneController::class);
    });

    // Protected customer
    Route::middleware(['auth:customer'])->group(function () {
        Route::post('logout', CustomerLogoutController::class);
        Route::get('me', [CustomerMeController::class, 'show']);
        Route::patch('me', [CustomerMeController::class, 'update']);

        // Addresses — set-default first to avoid /{address} collision
        Route::post('addresses/{address}/set-default', [CustomerAddressController::class, 'setDefault']);
        Route::apiResource('addresses', CustomerAddressController::class);

        // Wishlist — specific actions first, then /{wishlist} catch-alls
        Route::get('wishlist', [CustomerWishlistController::class, 'index']);
        Route::post('wishlist/add', [CustomerWishlistController::class, 'store']);
        Route::delete('wishlist/clear', [CustomerWishlistController::class, 'clear']);
        Route::post('wishlist/{wishlist}/move-to-cart', [CustomerWishlistController::class, 'moveToCart']);
        Route::delete('wishlist/{wishlist}', [CustomerWishlistController::class, 'destroy']);

        // Reviews (create only; public listing belongs to storefront)
        Route::post('reviews', [CustomerReviewController::class, 'store']);
        // "Can I review this product?" — checks for a delivered order
        // containing the product and an absence of an existing review.
        Route::get('reviews/eligibility/{product}', [CustomerReviewController::class, 'eligibility']);

        // Customer order history.
        Route::get('orders', [StorefrontOrderController::class, 'index']);
        Route::get('orders/{id}', [StorefrontOrderController::class, 'show'])->whereNumber('id');

        // Loyalty (read-only — vendor controls earn/redeem).
        Route::get('loyalty', [CustomerLoyaltyController::class, 'show']);
    });
});

/*
|--------------------------------------------------------------------------
| Public Storefront API
|--------------------------------------------------------------------------
|
| Resource endpoints for the storefront to consume. All endpoints under
| /api/store/* require a resolved store context.
|
*/
// Public shops directory (no store context — lists every active store).
Route::get('shops', [StorefrontInfoController::class, 'directory']);

Route::prefix('store')->middleware(['resolve.store', 'store.context'])->group(function () {
    Route::get('info', [StorefrontInfoController::class, 'show']);

    // Products
    Route::get('products', [StorefrontProductController::class, 'index']);
    Route::get('products/search', [StorefrontProductController::class, 'search']);
    Route::get('products/{slug}', [StorefrontProductController::class, 'show']);

    // Categories
    Route::get('categories', [StorefrontCategoryController::class, 'index']);
    Route::get('categories/{slug}', [StorefrontCategoryController::class, 'show']);

    // Brands
    Route::get('brands', [StorefrontBrandController::class, 'index']);
    Route::get('brands/{slug}', [StorefrontBrandController::class, 'show']);

    // Collections
    Route::get('collections', [StorefrontCollectionController::class, 'index']);
    Route::get('collections/{slug}', [StorefrontCollectionController::class, 'show']);

    // Cart (rate-limited)
    Route::middleware('throttle:30,1')->group(function () {
        Route::get('cart', [StorefrontCartController::class, 'show']);
        Route::post('cart/items', [StorefrontCartController::class, 'add']);
        Route::patch('cart/items/{id}', [StorefrontCartController::class, 'update'])->whereNumber('id');
        Route::delete('cart/items/{id}', [StorefrontCartController::class, 'remove'])->whereNumber('id');
        Route::delete('cart/clear', [StorefrontCartController::class, 'clear']);
        Route::post('cart/apply-coupon', [StorefrontCartController::class, 'applyCoupon']);
        Route::delete('cart/coupon', [StorefrontCartController::class, 'removeCoupon']);
    });

    // Checkout (rate-limited to prevent abuse)
    Route::post('checkout/calculate', [StorefrontCheckoutController::class, 'calculate']);
    Route::post('checkout/place', [StorefrontCheckoutController::class, 'place'])
        ->middleware('throttle:5,1');

    // Payment gateway hand-off (runs after checkout/place for online methods).
    Route::post('payment/initiate/{order}', [StorefrontPaymentController::class, 'initiate'])
        ->middleware('throttle:5,1')
        ->name('storefront.payment.initiate');

    // Blog
    Route::get('blog', [StorefrontBlogController::class, 'index']);
    Route::get('blog/categories', [StorefrontBlogController::class, 'categories']);
    Route::get('blog/{slug}', [StorefrontBlogController::class, 'show']);

    // CMS pages
    Route::get('pages/{slug}', [StorefrontCmsPageController::class, 'show']);

    // Contact form (rate-limited to prevent abuse).
    Route::post('contact', [StorefrontContactController::class, 'store'])
        ->middleware('throttle:20,1')
        ->name('storefront.contact.store');

    Route::get('checkout-fields', [StorefrontCheckoutFieldController::class, 'index'])
        ->name('storefront.checkout-fields');

    // Meta Pixel: public config + CAPI relay
    Route::get('meta-pixel', [StorefrontMetaPixelController::class, 'config'])->name('storefront.meta-pixel.config');
    Route::post('meta-pixel/event', [StorefrontMetaPixelController::class, 'event'])
        ->middleware('throttle:120,1')
        ->name('storefront.meta-pixel.event');

    // Google Tag Manager: public config
    Route::get('google-tag-manager', [StorefrontGoogleTagManagerController::class, 'config'])->name('storefront.gtm.config');

    // Manual (bKash/Nagad/Rocket) payment proof upload.
    Route::post('checkout/upload-proof', [\App\Http\Controllers\Api\Storefront\CheckoutController::class, 'uploadProof'])
        ->middleware('throttle:30,1')
        ->name('storefront.checkout.upload-proof');

    // Guest order tracking.
    Route::get('orders/track/{order_number}', [StorefrontOrderController::class, 'track'])
        ->name('storefront.orders.track');

    // Payment placeholder (real gateway integration plugs in later).
    Route::get('payment/placeholder/{order}', function (string $order) {
        return \App\Http\Responses\ApiResponse::success([
            'order' => $order,
            'note' => 'Payment gateway placeholder — integration pending.',
        ]);
    })->name('storefront.payment.placeholder');
});

