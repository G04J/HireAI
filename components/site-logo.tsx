'use client';

import Link from 'next/link';
import Image from 'next/image';

type SiteLogoProps = {
  href?: string;
  className?: string;
  height?: number;
  width?: number;
  priority?: boolean;
};

export function SiteLogo({ href = '/', className = '', height = 32, width = 128, priority }: SiteLogoProps) {
  const img = (
    <Image
      src="/logos/websiteLogo.png"
      alt="hireLens"
      height={height}
      width={width}
      className={`object-contain ${className}`}
      priority={priority}
      unoptimized
    />
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center gap-2 group">
        {img}
      </Link>
    );
  }

  return img;
}
