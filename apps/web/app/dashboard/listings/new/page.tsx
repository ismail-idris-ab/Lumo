'use client';

import { ListingForm } from '@/components/listing/listing-form';

export default function NewListingPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Post a new ad</h1>
      <ListingForm />
    </div>
  );
}
