'use client';
import { useState } from 'react';
import Image from 'next/image';
import type { ListingImageDTO } from '@lumo/shared';

interface Props {
  images: ListingImageDTO[];
  title: string;
  isPromoted: boolean;
}

export function ListingGallery({ images, title, isPromoted }: Props) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div className="space-y-2">
      {/* Main image */}
      <div className="relative h-[380px] overflow-hidden rounded-xl bg-muted md:h-[440px]">
        {current ? (
          <Image
            key={current.url}
            src={current.url}
            alt={title}
            fill
            sizes="(max-width:1024px) 100vw, 65vw"
            className="object-cover transition-opacity duration-200"
            priority={active === 0}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
        )}
        {isPromoted && (
          <span className="absolute left-3 top-3 rounded-md bg-emerald-600 px-2 py-1 text-xs font-bold text-white">
            Promoted
          </span>
        )}
        {images.length > 0 && (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white">
            📷 {active + 1}/{images.length}
          </span>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-muted transition-all ${
                i === active
                  ? 'ring-2 ring-emerald-500 ring-offset-1'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <Image src={img.url} alt={`${title} image ${i + 1}`} fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
