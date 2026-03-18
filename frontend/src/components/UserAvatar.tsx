'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

const DICEBEAR_STYLE = 'notionists-neutral';
const DICEBEAR_BACKGROUND = ['f7f7f7', 'efe5e6', 'f3ebeb', 'e8e8e8', 'f1eeee'].join(',');

function buildDiceBearUrl(seed: string) {
  const url = new URL(`https://api.dicebear.com/9.x/${DICEBEAR_STYLE}/svg`);
  url.searchParams.set('seed', seed);
  url.searchParams.set('backgroundType', 'solid');
  url.searchParams.set('backgroundColor', DICEBEAR_BACKGROUND);
  url.searchParams.set('radius', '50');
  url.searchParams.set('scale', '95');
  return url.toString();
}

function buildFallbackDataUrl(label: string) {
  const initials =
    label
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'IP';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="48" fill="#f1ecec" />
      <circle cx="74" cy="22" r="8" fill="#df2531" opacity="0.14" />
      <circle cx="20" cy="76" r="10" fill="#000000" opacity="0.08" />
      <text x="48" y="56" text-anchor="middle" font-size="28" font-family="Open Sans, Segoe UI, Arial, sans-serif" font-weight="700" fill="#161616">${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

interface UserAvatarProps {
  seed?: string;
  label: string;
  imageUrl?: string | null;
  className?: string;
}

export function UserAvatar({ seed, label, imageUrl, className }: UserAvatarProps) {
  const stableSeed = seed || label || 'infra-pilot';
  const fallback = buildFallbackDataUrl(label);
  const primarySrc = useMemo(() => imageUrl || buildDiceBearUrl(stableSeed), [imageUrl, stableSeed]);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = failedSrc === primarySrc ? fallback : primarySrc;

  return (
    <Image
      src={src}
      alt={label}
      width={40}
      height={40}
      unoptimized
      className={cn('h-10 w-10 shrink-0 rounded-full border border-border/80 bg-muted object-cover', className)}
      onError={() => {
        if (src !== fallback) {
          setFailedSrc(primarySrc);
        }
      }}
    />
  );
}
