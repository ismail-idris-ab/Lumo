'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import {
  conditionValues,
  NG_LGAS,
  NG_STATES,
  type AttributeFieldDef,
  type CategorySummary,
  type PublicListing,
} from '@lumo/shared';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Field, FieldInput, FieldTextarea, inputClassName } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { CategoryDrawer } from './category-drawer';

// ─── Types ───────────────────────────────────────────────────────────────────

type WizardStep = 'step1' | 'step2' | 'success';

interface PhotoSlot {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  error: string | null;
  uploaded: boolean;
}

// AttributeFieldDef imported from @lumo/shared.

// Mirrors the private UploadSignature in upload.ts (not exported from that file).
interface UploadSignature {
  cloudName: string;
  apiKey: string | number;
  timestamp: number;
  folder: string;
  signature: string;
}

// ─── Form schema ─────────────────────────────────────────────────────────────

const formSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(5000),
  priceNaira: z.coerce.number().min(0),
  condition: z.enum(conditionValues),
  categoryId: z.string().min(1, 'Choose a category'),
  state: z.string().trim().min(2).max(60),
  city: z.string().trim().min(2).max(60),
  area: z.string().trim().max(60).optional(),
  contactPhone: z.string().trim().regex(/^\+?[0-9\s-]{7,15}$/, 'Invalid phone number').optional().or(z.literal('')),
});
type FormValues = z.input<typeof formSchema>;

const CONDITION_LABELS: Record<string, string> = {
  NEW: 'New',
  USED: 'Used',
  FOR_PARTS: 'For parts',
};

// ─── Upload with XHR progress ─────────────────────────────────────────────────

async function uploadWithProgress(
  listingId: string,
  slot: PhotoSlot,
  isPrimary: boolean,
  onProgress: (pct: number) => void,
): Promise<void> {
  const sign = await api.post<UploadSignature>(`/listings/${listingId}/images/sign`);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('file', slot.file);
    form.append('api_key', String(sign.apiKey));
    form.append('timestamp', String(sign.timestamp));
    form.append('folder', sign.folder);
    form.append('signature', sign.signature);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 90));
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error('Upload failed'));
        return;
      }
      const data = JSON.parse(xhr.responseText) as { secure_url: string; public_id: string };
      onProgress(95);
      api
        .post(`/listings/${listingId}/images`, {
          url: data.secure_url,
          publicId: data.public_id,
          isPrimary,
        })
        .then(() => { onProgress(100); resolve(); })
        .catch(reject);
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`);
    xhr.send(form);
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ListingForm({ listing }: { listing?: PublicListing }) {
  const router = useRouter();
  const { user } = useAuth();
  const editing = Boolean(listing);

  const [step, setStep] = useState<WizardStep>('step1');
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [attrValues, setAttrValues] = useState<Record<string, string | string[]>>(() => {
    if (!listing?.attributes) return {};
    return Object.fromEntries(
      Object.entries(listing.attributes).map(([k, v]) => [
        k,
        Array.isArray(v) ? v.map(String) : String(v ?? ''),
      ]),
    );
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const categoryBtnRef = useRef<HTMLButtonElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdListing, setCreatedListing] = useState<PublicListing | null>(null);

  // Keep a ref to photoSlots so the unmount cleanup can revoke all preview URLs.
  const photoSlotsRef = useRef<PhotoSlot[]>([]);
  photoSlotsRef.current = photoSlots;

  useEffect(() => {
    return () => {
      photoSlotsRef.current.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    };
  }, []);

  // ── Categories ──────────────────────────────────────────────────────────────

  const { data: catData } = useQuery({
    queryKey: ['categories-tree'],
    queryFn: () => api.get<{ categories: CategorySummary[] }>('/categories?tree=true'),
  });
  const categoryTree = catData?.categories ?? [];
  const allCategories = categoryTree.flatMap((p) => [p, ...(p.children ?? [])]);

  // ── Form ────────────────────────────────────────────────────────────────────

  const form = useForm<FormValues>({
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
          contactPhone: (listing as PublicListing & { contactPhone?: string }).contactPhone ?? '',
        }
      : { condition: 'USED', contactPhone: '' },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = form;

  const selectedCategoryId = watch('categoryId');
  const selectedCategory = allCategories.find((c) => c.id === selectedCategoryId);
  const selectedParent = selectedCategory?.parentId
    ? categoryTree.find((p) => p.id === selectedCategory.parentId)
    : categoryTree.find((p) => p.id === selectedCategoryId);
  const attrSchema = (selectedCategory?.attributeSchema ?? selectedParent?.attributeSchema) as AttributeFieldDef[] | null | undefined;

  const selectedState = watch('state');
  const lgas = selectedState ? (NG_LGAS[selectedState] ?? []) : [];

  const titleValue = watch('title') ?? '';
  const conditionValue = watch('condition');

  // Pre-fill contact phone from profile once auth loads (create mode only).
  useEffect(() => {
    if (!editing && user?.phone) setValue('contactPhone', user.phone);
  }, [user?.phone, editing, setValue]);

  // Clear attribute values when category changes (create mode only).
  useEffect(() => {
    if (!editing) setAttrValues({});
  }, [selectedCategoryId, editing]);

  // Reset LGA when state changes (create mode only).
  useEffect(() => {
    if (!editing) setValue('city', '');
  }, [selectedState, editing, setValue]);

  // ── Photo handlers ───────────────────────────────────────────────────────────

  function handleFileAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const remaining = 8 - photoSlots.length;
    const toAdd = Array.from(files).slice(0, remaining);
    const newSlots: PhotoSlot[] = toAdd.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      error: null,
      uploaded: false,
    }));
    setPhotoSlots((prev) => [...prev, ...newSlots]);
    setPhotoError(null);
    e.target.value = '';
  }

  function handleRemoveSlot(slotId: string) {
    setPhotoSlots((prev) => {
      const slot = prev.find((s) => s.id === slotId);
      if (slot) URL.revokeObjectURL(slot.previewUrl);
      return prev.filter((s) => s.id !== slotId);
    });
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) return;
    setPhotoSlots((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      if (moved) next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
  }

  // ── Step transition ──────────────────────────────────────────────────────────

  async function advanceToStep2() {
    const hasExistingImages = (listing?.images.length ?? 0) > 0;
    const hasPhotos = photoSlots.length > 0 || hasExistingImages;
    if (!hasPhotos) setPhotoError('Add at least one photo to continue');
    else setPhotoError(null);

    const valid = await trigger(['title', 'categoryId', 'state', 'city']);
    if (valid && hasPhotos) setStep('step2');
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function onSubmit(values: FormValues) {
    setSubmitError(null);

    const attributes: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(attrValues)) {
      if (Array.isArray(v) && v.length > 0) attributes[k] = v;
      else if (typeof v === 'string' && v.trim()) attributes[k] = v.trim();
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
      contactPhone: values.contactPhone?.trim() || undefined,
      ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
    };

    try {
      let listingId = listing?.id;
      let resultListing: PublicListing;

      if (editing && listingId) {
        await api.patch(`/listings/${listingId}`, payload);
        // PATCH may not return body; merge for success screen.
        resultListing = { ...listing!, ...payload, priceKobo: payload.priceKobo } as PublicListing;
      } else {
        const res = await api.post<{ listing: PublicListing }>('/listings', payload);
        listingId = res.listing.id;
        resultListing = res.listing;
      }

      const existingCount = listing?.images.length ?? 0;
      for (let i = 0; i < photoSlots.length; i++) {
        const slot = photoSlots[i]!;
        const isPrimary = existingCount === 0 && i === 0;
        try {
          await uploadWithProgress(listingId!, slot, isPrimary, (pct) => {
            setPhotoSlots((prev) =>
              prev.map((s) => (s.id === slot.id ? { ...s, progress: pct } : s)),
            );
          });
          setPhotoSlots((prev) =>
            prev.map((s) => (s.id === slot.id ? { ...s, uploaded: true } : s)),
          );
        } catch {
          setPhotoSlots((prev) =>
            prev.map((s) => (s.id === slot.id ? { ...s, error: 'Upload failed' } : s)),
          );
        }
      }

      setCreatedListing(resultListing);
      setStep('success');
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : 'Could not save listing');
    }
  }

  // ── Attribute field renderer (schema-driven) ────────────────────────────────

  function renderAttrField(field: AttributeFieldDef) {
    const id = `attr-${field.key}`;
    const type = field.type ?? 'text';

    if (type === 'boolean') {
      return (
        <div className="flex gap-2">
          {(['true', 'false'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAttrValues((p) => ({ ...p, [field.key]: v }))}
              className={cn(
                'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                attrValues[field.key] === v
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
              )}
            >
              {v === 'true' ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      );
    }

    if (type === 'select') {
      return (
        <select
          id={id}
          className={inputClassName}
          value={(attrValues[field.key] as string) ?? ''}
          onChange={(e) => setAttrValues((p) => ({ ...p, [field.key]: e.target.value }))}
        >
          <option value="">Choose…</option>
          {field.options?.map((o: string) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    }

    if (type === 'multiselect') {
      const selected = (attrValues[field.key] as string[] | undefined) ?? [];
      return (
        <div className="flex flex-wrap gap-2">
          {field.options?.map((o: string) => {
            const active = selected.includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() =>
                  setAttrValues((p) => {
                    const cur = (p[field.key] as string[] | undefined) ?? [];
                    return {
                      ...p,
                      [field.key]: active ? cur.filter((x) => x !== o) : [...cur, o],
                    };
                  })
                }
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300',
                )}
              >
                {o}
              </button>
            );
          })}
        </div>
      );
    }

    if (type === 'textarea') {
      return (
        <textarea
          id={id}
          rows={3}
          className={inputClassName}
          value={(attrValues[field.key] as string) ?? ''}
          placeholder={field.placeholder ?? field.label}
          onChange={(e) => setAttrValues((p) => ({ ...p, [field.key]: e.target.value }))}
        />
      );
    }

    // text | number
    return (
      <div className="relative">
        <input
          id={id}
          type={type === 'number' ? 'number' : 'text'}
          className={cn(inputClassName, field.unit && 'pr-12')}
          value={(attrValues[field.key] as string) ?? ''}
          placeholder={field.placeholder ?? field.label}
          onChange={(e) => setAttrValues((p) => ({ ...p, [field.key]: e.target.value }))}
        />
        {field.unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {field.unit}
          </span>
        )}
      </div>
    );
  }

  // ── Category label helper ────────────────────────────────────────────────────

  function categoryLabel(): string {
    if (!selectedCategory) return '';
    if (selectedCategory.parentId) {
      const parent = selectedParent;
      return parent ? `${parent.name} → ${selectedCategory.name}` : selectedCategory.name;
    }
    return selectedCategory.name;
  }

  // ── Success thumbnail ────────────────────────────────────────────────────────

  const successThumb =
    photoSlots[0]?.previewUrl ?? createdListing?.images?.[0]?.url ?? null;

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-xl">
      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      {step !== 'success' && (
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-900">
              Step {step === 'step1' ? '1' : '2'} of 2
            </span>
            <span className="text-slate-500">
              {step === 'step1' ? 'Details & Photos' : 'Pricing & Description'}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-300"
              style={{ width: step === 'step1' ? '50%' : '100%' }}
            />
          </div>
        </div>
      )}

      {/* ── Success screen ───────────────────────────────────────────────── */}
      {step === 'success' && createdListing && (
        <div className="flex flex-col items-center gap-6 py-10 text-center">
          {successThumb ? (
            <div className="relative h-32 w-32 overflow-hidden rounded-2xl shadow-md">
              <Image src={successThumb} alt={createdListing.title} fill className="object-cover" />
            </div>
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
              📦
            </div>
          )}

          <div className="inline-flex items-center rounded-full bg-amber-100 px-4 py-1.5 text-sm font-medium text-amber-800">
            Under review
          </div>

          <div className="space-y-1.5">
            <p className="text-xl font-bold text-slate-900">{createdListing.title}</p>
            <p className="text-sm text-slate-500">
              Your listing is under review and will go live once approved.
            </p>
          </div>

          <div className="flex w-full max-w-xs flex-col gap-3">
            <Button onClick={() => router.push('/dashboard/listings')}>
              View my ads
            </Button>
            {!editing && (
              <Button variant="outline" onClick={() => router.push('/dashboard/listings/new')}>
                Post another ad
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Wizard form ──────────────────────────────────────────────────── */}
      {step !== 'success' && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* ════════════════════════════════════════ STEP 1 ══════════════════ */}
          {step === 'step1' && (
            <>
              {/* Title */}
              <Field label="Title" error={errors.title?.message}>
                <div className="relative">
                  <FieldInput
                    {...register('title')}
                    placeholder="e.g. iPhone 13 Pro 256GB"
                    maxLength={100}
                    className="pr-14"
                  />
                  <span
                    className={cn(
                      'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs',
                      titleValue.length >= 90 ? 'text-amber-500' : 'text-slate-400',
                    )}
                  >
                    {titleValue.length}/100
                  </span>
                </div>
              </Field>

              {/* Category */}
              <Field label="Category" error={errors.categoryId?.message} htmlFor="category-btn">
                <button
                  ref={categoryBtnRef}
                  type="button"
                  id="category-btn"
                  onClick={() => setDrawerOpen((o) => !o)}
                  className={cn(
                    inputClassName,
                    'flex items-center justify-between text-left transition-colors',
                    drawerOpen && 'border-emerald-400 ring-2 ring-emerald-400/20',
                    !selectedCategoryId && 'text-muted-foreground',
                  )}
                >
                  <span className="truncate">{selectedCategoryId ? categoryLabel() : 'Choose a category…'}</span>
                  <svg
                    className={cn('ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150', drawerOpen && 'rotate-180')}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </Field>

              {/* Photos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Photos
                    <span className="ml-0.5 text-destructive">*</span>
                  </span>
                  <span className="text-xs text-slate-400">{photoSlots.length}/8</span>
                </div>

                {/* Existing images (edit mode) */}
                {editing && (listing?.images.length ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Current photos</p>
                    <div className="grid grid-cols-4 gap-2">
                      {listing!.images.map((img) => (
                        <div
                          key={img.id}
                          className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                        >
                          <Image
                            src={img.url}
                            alt="existing"
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                          {img.isPrimary && (
                            <span className="absolute bottom-1 left-1 rounded bg-emerald-600 px-1 py-0.5 text-[9px] font-bold uppercase text-white">
                              Cover
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New photo grid */}
                <div className="grid grid-cols-4 gap-2">
                  {/* Add button */}
                  {photoSlots.length < 8 && (
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-500">
                      <span className="text-2xl leading-none">+</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide">Add</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFileAdd}
                      />
                    </label>
                  )}

                  {/* Photo thumbnails */}
                  {photoSlots.map((slot, i) => (
                    <div
                      key={slot.id}
                      draggable
                      onDragStart={() => handleDragStart(i)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, i)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'relative aspect-square overflow-hidden rounded-lg bg-slate-100',
                        dragIndex === i && 'opacity-50 ring-2 ring-emerald-400',
                      )}
                    >
                      <Image
                        src={slot.previewUrl}
                        alt={`photo ${i + 1}`}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />

                      {/* Cover badge */}
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 rounded bg-emerald-600 px-1 py-0.5 text-[9px] font-bold uppercase text-white">
                          Cover
                        </span>
                      )}

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(slot.id)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
                      >
                        ×
                      </button>

                      {/* Upload progress */}
                      {slot.progress > 0 && !slot.uploaded && !slot.error && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1 pb-1 pt-0.5">
                          <div className="h-1 w-full overflow-hidden rounded-full bg-white/30">
                            <div
                              className="h-full rounded-full bg-white transition-all"
                              style={{ width: `${slot.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Error indicator */}
                      {slot.error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-900/60">
                          <span className="text-[10px] font-semibold text-white">Failed</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {photoSlots.length > 0 && (
                  <p className="text-xs text-slate-400">
                    First photo is cover · Drag to reorder
                  </p>
                )}
                {photoError && (
                  <p className="text-xs text-destructive">{photoError}</p>
                )}
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="State" error={errors.state?.message}>
                  <select className={inputClassName} {...register('state')}>
                    <option value="">Select state…</option>
                    {NG_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="City / LGA" error={errors.city?.message}>
                  {lgas.length > 0 ? (
                    <select className={inputClassName} {...register('city')}>
                      <option value="">Select LGA…</option>
                      {lgas.map((lga) => (
                        <option key={lga} value={lga}>{lga}</option>
                      ))}
                    </select>
                  ) : (
                    <FieldInput
                      {...register('city')}
                      placeholder={selectedState ? 'Enter city' : 'Select state first'}
                      disabled={!selectedState}
                    />
                  )}
                </Field>
              </div>
              <Field label="Area (optional)" error={errors.area?.message}>
                <FieldInput {...register('area')} placeholder="e.g. Allen Avenue" />
              </Field>

              {/* Next button */}
              <Button type="button" className="w-full" onClick={advanceToStep2}>
                Next →
              </Button>
            </>
          )}

          {/* ════════════════════════════════════════ STEP 2 ══════════════════ */}
          {step === 'step2' && (
            <>
              {/* Back */}
              <button
                type="button"
                onClick={() => setStep('step1')}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
              >
                ← Back
              </button>

              {/* Condition pills */}
              <div className="space-y-2">
                <span className="text-sm font-medium">Condition</span>
                <div className="flex gap-2">
                  {conditionValues.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setValue('condition', c, { shouldValidate: true })}
                      className={cn(
                        'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                        conditionValue === c
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                      )}
                    >
                      {CONDITION_LABELS[c] ?? c}
                    </button>
                  ))}
                </div>
                {errors.condition && (
                  <p className="text-xs text-destructive">{errors.condition.message}</p>
                )}
              </div>

              {/* Dynamic attribute fields */}
              {attrSchema && attrSchema.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                  <p className="text-sm font-semibold text-slate-700">
                    {selectedCategory?.name} details
                  </p>
                  {attrSchema.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <label
                        htmlFor={`attr-${field.key}`}
                        className="text-sm font-medium"
                      >
                        {field.label}
                        {field.required && (
                          <span className="ml-0.5 text-destructive">*</span>
                        )}
                      </label>
                      {renderAttrField(field)}
                    </div>
                  ))}
                </div>
              )}

              {/* Description */}
              <Field label="Description" error={errors.description?.message}>
                <FieldTextarea
                  {...register('description')}
                  placeholder="Describe your item — condition, features, reason for selling…"
                  rows={5}
                />
              </Field>

              {/* Price */}
              <Field label="Price (₦)" error={errors.priceNaira?.message}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    ₦
                  </span>
                  <FieldInput
                    type="number"
                    inputMode="numeric"
                    {...register('priceNaira')}
                    className="pl-7"
                    placeholder="0"
                  />
                </div>
              </Field>

              {/* Contact phone */}
              <Field
                label="Contact phone (optional)"
                error={errors.contactPhone?.message}
              >
                <FieldInput
                  type="tel"
                  inputMode="tel"
                  {...register('contactPhone')}
                  placeholder="e.g. 08012345678"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Leave blank to use your profile phone. Only shown to logged-in buyers.
                </p>
              </Field>

              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}

              <p className="text-xs text-muted-foreground">
                New and edited listings go to review before appearing publicly.
              </p>

              {/* Submit */}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting
                  ? photoSlots.length > 0
                    ? `Uploading photos…`
                    : 'Saving…'
                  : editing
                  ? 'Save changes'
                  : 'Post ad'}
              </Button>
            </>
          )}
        </form>
      )}

      {/* Category drawer (fixed overlay — outside form to avoid nesting issues) */}
      <CategoryDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelect={(id) => {
          setValue('categoryId', id, { shouldValidate: true });
          setDrawerOpen(false);
        }}
        categories={categoryTree}
        selectedId={selectedCategoryId ?? ''}
        triggerRef={categoryBtnRef}
      />
    </div>
  );
}
