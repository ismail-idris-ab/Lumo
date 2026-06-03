'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PublicListing } from '@lumo/shared';
import { api } from '@/lib/api-client';
import { ListingForm } from '@/components/listing/listing-form';

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => api.get<{ listings: PublicListing[] }>('/listings/mine'),
  });
  const listing = data?.listings.find((l) => l.id === id);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Edit listing</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : listing ? (
        <ListingForm listing={listing} />
      ) : (
        <p className="text-muted-foreground">Listing not found.</p>
      )}
    </div>
  );
}
