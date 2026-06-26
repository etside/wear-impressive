'use client';

/**
 * Fly-to-cart animation — clones the product hero image, animates it from
 * its current viewport position into the cart icon in the header, then
 * "bumps" the icon as feedback that the item landed.
 *
 * Why: a brand-owner-requested affordance after we stopped navigating
 * straight to /cart on Add-to-Cart. Without an animation the page seems
 * unchanged (item silently appears in the slideover the user has to open),
 * so we visually confirm the action by physically launching the product
 * into the cart icon.
 *
 * Implementation notes:
 *   - We use the Web Animations API (`element.animate()`) which is well
 *     supported and lets us precisely time the descent + scale + fade in
 *     a single keyframe set.
 *   - The clone is `position: fixed` so it floats above the page even if
 *     the page scrolls. We measure with `getBoundingClientRect()` rather
 *     than absolute coords for the same reason.
 *   - The cart icon is identified by `data-cart-button="true"` on the
 *     header button. If it's not in the DOM yet, we silently skip the
 *     animation rather than throwing — the product is still added.
 */

interface FlyOptions {
  /** Override the duration in ms. Defaults to 700. */
  duration?: number;
}

export async function flyToCart(source: HTMLElement | null | undefined, options: FlyOptions = {}): Promise<void> {
  if (typeof window === 'undefined' || !source) return;

  const cartButton = document.querySelector<HTMLElement>('[data-cart-button="true"]');
  if (!cartButton) return;

  const sourceRect = source.getBoundingClientRect();
  const targetRect = cartButton.getBoundingClientRect();

  // Skip if the source is offscreen (e.g., user scrolled the hero out of view).
  // The page is already responding via the cart count badge, no animation needed.
  if (sourceRect.width <= 0 || sourceRect.height <= 0) return;

  // Clone the image. If the source is a wrapper, take its first <img> if present.
  const sourceImg: HTMLImageElement | null =
    source.tagName === 'IMG'
      ? (source as HTMLImageElement)
      : source.querySelector('img');

  // Build the flying element. Either a real image clone (preferred) or a
  // soft tinted circle as fallback when no <img> is in the source.
  const fly = document.createElement('div');
  fly.style.position = 'fixed';
  fly.style.zIndex = '60'; // above slideovers (z-50) so it lands on the cart
  fly.style.left = `${sourceRect.left}px`;
  fly.style.top = `${sourceRect.top}px`;
  fly.style.width = `${Math.min(sourceRect.width, 160)}px`;
  fly.style.height = `${Math.min(sourceRect.height, 160)}px`;
  fly.style.pointerEvents = 'none';
  fly.style.borderRadius = '12px';
  fly.style.overflow = 'hidden';
  fly.style.boxShadow = '0 12px 32px rgba(0,0,0,0.18)';
  fly.style.willChange = 'transform, opacity';

  if (sourceImg && sourceImg.src) {
    const cloneImg = sourceImg.cloneNode(false) as HTMLImageElement;
    cloneImg.style.width = '100%';
    cloneImg.style.height = '100%';
    cloneImg.style.objectFit = 'cover';
    fly.appendChild(cloneImg);
  } else {
    fly.style.background = '#2596be';
  }

  document.body.appendChild(fly);

  // Centre of source vs centre of target; use these to compute the
  // translate values for the keyframe end state.
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  const sourceCenterX = sourceRect.left + Math.min(sourceRect.width, 160) / 2;
  const sourceCenterY = sourceRect.top + Math.min(sourceRect.height, 160) / 2;
  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;

  const duration = options.duration ?? 700;

  await fly.animate(
    [
      // Drift up slightly mid-flight for an arc effect, then dive into the cart.
      { transform: 'translate(0, 0) scale(1)', opacity: 1, offset: 0 },
      { transform: `translate(${dx * 0.6}px, ${dy * 0.4 - 40}px) scale(0.55)`, opacity: 0.9, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0, offset: 1 },
    ],
    {
      duration,
      easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      fill: 'forwards',
    },
  ).finished.catch(() => {});

  fly.remove();

  // "Bump" the cart icon for ~250ms so the user knows the parcel landed.
  cartButton.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(1.25)' },
      { transform: 'scale(1)' },
    ],
    { duration: 280, easing: 'ease-out' },
  );
}

/**
 * Open the storefront cart slideover. The layout-level listener flips
 * its `cartOpen` state in response. Decoupled via a CustomEvent so any
 * page (product detail, listings, etc.) can request the panel without
 * importing layout state.
 */
export function openCartSlideover() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('cart:open'));
}
