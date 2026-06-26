'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StaffRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/settings/users'); }, [router]);
  return null;
}
