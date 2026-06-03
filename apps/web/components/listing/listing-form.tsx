'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { conditionValues, type CategorySummary, type PublicListing } from '@lumo/shared';
import { api, ApiError } from '@/lib/api-client';
import { uploadListingImage } from '@/lib/upload';
import { Button } from '@/components/ui/button';
import { Field, FieldInput, FieldTextarea, inputClassName } from '@/components/ui/field';

// Local form schema (price in naira for humans; converted to kobo on submit).
const formSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(5000),
  priceNaira: z.coerce.number().min(0),
  condition: z.enum(conditionValues),
  categoryId: z.string().min(1, 'Choose a category'),
  state: z.string().trim().min(2).max(60),
  city: z.string().trim().min(2).max(60),
  area: z.string().trim().max(60).optional(),
});
type FormValues = z.input<typeof formSchema>;

export function ListingForm({ listing }: { listing?: PublicListing }) {
  const router = useRouter();
  const editing = Boolean(listing);
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ categories: CategorySummary[] }>('/categories'),
  });
  const categories = catData?.categories ?? [];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: listing
      ? {
          title: listing.title,
          description: listing.description,
          priceNaira: listing.priceKobo / 100,
          condition: listing.condition,
          categoryId: listing.categoryId,
          state: listing.state,
          city: listing.city,
          area: listing.area ?? undefined,
        }
      : { condition: 'USED' },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const payload = {
      title: values.title,
      description: values.description,
      priceKobo: Math.round(Number(values.priceNaira) * 100),
      condition: values.condition,
      categoryId: values.categoryId,
      state: values.state,
      city: values.city,
      area: values.area || undefined,
    };
    try {
      let listingId = listing?.id;
      if (editing && listingId) {
        await api.patch(`/listings/${listingId}`, payload);
      } else {
        const res = await api.post<{ listing: PublicListing }>('/listings', payload);
        listingId = res.listing.id;
      }
      // Upload any newly-selected images.
      if (files && listingId) {
        const existing = listing?.images.length ?? 0;
        for (let i = 0; i < files.length; i++) {
          await uploadListingImage(listingId, files[i]!, existing === 0 && i === 0);
        }
      }
      router.push('/dashboard/listings');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save listing');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-4">
      <Field label="Title" error={errors.title?.message}>
        <FieldInput {...register('title')} placeholder="e.g. iPhone 13 Pro 256GB" />
      </Field>
      <Field label="Description" error={errors.description?.message}>
        <FieldTextarea {...register('description')} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (₦)" error={errors.priceNaira?.message}>
          <FieldInput type="number" inputMode="numeric" {...register('priceNaira')} />
        </Field>
        <Field label="Condition" error={errors.condition?.message}>
          <select className={inputClassName} {...register('condition')}>
            {conditionValues.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Category" error={errors.categoryId?.message}>
        <select className={inputClassName} {...register('categoryId')}>
          <option value="">Select a category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="State" error={errors.state?.message}>
          <FieldInput {...register('state')} placeholder="Lagos" />
        </Field>
        <Field label="City / LGA" error={errors.city?.message}>
          <FieldInput {...register('city')} placeholder="Ikeja" />
        </Field>
        <Field label="Area (optional)" error={errors.area?.message}>
          <FieldInput {...register('area')} />
        </Field>
      </div>
      <Field label={editing ? 'Add more images' : 'Images (1–8)'}>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className="text-sm"
        />
      </Field>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        New and edited listings go to review before appearing publicly.
      </p>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : editing ? 'Save changes' : 'Post ad'}
      </Button>
    </form>
  );
}
