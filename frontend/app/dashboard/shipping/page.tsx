'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ShippingRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/settings/shipping'); }, [router]);
  return null;
}
