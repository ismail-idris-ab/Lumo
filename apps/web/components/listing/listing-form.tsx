'use client';

import { useState, useEffect } from 'react';
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

const NG_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT - Abuja','Gombe',
  'Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos',
  'Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto',
  'Taraba','Yobe','Zamfara',
];

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

interface AttributeField {
  key: string;
  label: string;
  primary?: boolean;
  format?: string;
}

export function ListingForm({ listing }: { listing?: PublicListing }) {
  const router = useRouter();
  const editing = Boolean(listing);
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Dynamic attribute values — keyed by field.key
  const [attrValues, setAttrValues] = useState<Record<string, string>>(() => {
    if (!listing?.attributes) return {};
    return Object.fromEntries(
      Object.entries(listing.attributes).map(([k, v]) => [k, String(v ?? '')]),
    );
  });

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ categories: CategorySummary[] }>('/categories'),
  });
  const categories = catData?.categories ?? [];

  const {
    register,
    handleSubmit,
    watch,
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

  const selectedCategoryId = watch('categoryId');
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const attrSchema = selectedCategory?.attributeSchema as AttributeField[] | null | undefined;

  // Clear attribute values when category changes (only in create mode).
  useEffect(() => {
    if (!editing) setAttrValues({});
  }, [selectedCategoryId, editing]);

  async function onSubmit(values: FormValues) {
    setError(null);

    // Collect non-empty attribute values.
    const attributes: Record<string, string> = {};
    for (const [k, v] of Object.entries(attrValues)) {
      if (v.trim()) attributes[k] = v.trim();
    }

    const payload = {
      title: values.title,
      description: values.description,
      priceKobo: Math.round(Number(values.priceNaira) * 100),
      condition: values.condition,
      categoryId: values.categoryId,
      state: values.state,
      city: values.city,
      area: values.area || undefined,
      ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
    };
    try {
      let listingId = listing?.id;
      if (editing && listingId) {
        await api.patch(`/listings/${listingId}`, payload);
      } else {
        const res = await api.post<{ listing: PublicListing }>('/listings', payload);
        listingId = res.listing.id;
      }
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

      {/* Dynamic attribute fields — rendered when selected category has a schema */}
      {attrSchema && attrSchema.length > 0 && (
        <div className="rounded-lg border border-slate-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Product details</p>
          <div className="grid grid-cols-2 gap-3">
            {attrSchema.map((field) => (
              <Field key={field.key} label={field.label}>
                <input
                  type="text"
                  value={attrValues[field.key] ?? ''}
                  onChange={(e) =>
                    setAttrValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  placeholder={field.label}
                  className={inputClassName}
                />
              </Field>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Field label="State" error={errors.state?.message}>
          <select className={inputClassName} {...register('state')}>
            <option value="">Select state…</option>
            {NG_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
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
