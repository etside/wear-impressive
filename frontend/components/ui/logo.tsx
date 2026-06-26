'use client';
import Image from 'next/image';

interface LogoProps {
  height?: number;
  variant?: 'light' | 'dark';
}

export function Logo({ height = 28 }: LogoProps) {
  return (
    <Image
      src="/images/wi-logo.png"
      alt="Wear Impressive"
      height={height}
      width={180}
      style={{ height: `${height}px`, width: 'auto' }}
      priority
    />
  );
}
