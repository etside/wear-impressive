'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useShopBase } from '@/lib/use-shop-base';

// Old route: orders now live under /account/orders so the account sidebar is
// consistent across every customer surface.
export default function OrdersRedirectPage() {
  const router = useRouter();
  const __sb = useShopBase();

  useEffect(() => {
    router.replace(`${__sb}/account/orders`);
  }, [router, __sb]);

  return (
    <div className="container-app pt-12 pb-10 text-center text-sm text-gray-500">
      Redirecting to your orders...
    </div>
  );
}
