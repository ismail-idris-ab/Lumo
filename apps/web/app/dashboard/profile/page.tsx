'use client';

import { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { NG_STATES, NG_LGAS } from '@lumo/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Field, FieldInput, FieldTextarea, inputClassName } from '@/components/ui/field';
import Image from 'next/image';

interface UploadSignature {
  cloudName: string;
  apiKey: string | number;
  timestamp: number;
  folder: string;
  signature: string;
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // Pre-fill from auth context once loaded.
  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setBio(user.bio ?? '');
    setState(user.state ?? '');
    setCity(user.city ?? '');
    setAvatarUrl(user.avatarUrl ?? null);
  }, [user]);

  const lgas = state ? (NG_LGAS[state] ?? []) : [];

  // Clear city when state changes.
  function handleStateChange(s: string) {
    setState(s);
    setCity('');
  }

  // Avatar pick → upload to Cloudinary → store URL in state (saved on form submit).
  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setAvatarUploading(true);
    setError(null);
    try {
      const sign = await api.post<UploadSignature>('/me/avatar/sign');
      const form = new FormData();
      form.append('file', file);
      form.append('api_key', String(sign.apiKey));
      form.append('timestamp', String(sign.timestamp));
      form.append('folder', sign.folder);
      form.append('signature', sign.signature);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
        { method: 'POST', body: form },
      );
      if (!res.ok) throw new Error('Upload failed');
      const data = (await res.json()) as { secure_url: string };
      setAvatarUrl(data.secure_url);
    } catch {
      setError('Avatar upload failed. Try again.');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.patch('/me', { name, bio, avatarUrl: avatarUrl ?? '', state, city });
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My profile</h1>
        <p className="text-sm text-slate-500">Shown on your public seller page and listings.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={avatarUploading}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-slate-200 hover:ring-emerald-400 transition-all focus:outline-none focus:ring-emerald-400"
            aria-label="Change profile photo"
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-emerald-100 text-xl font-bold text-emerald-700">
                {initials}
              </span>
            )}
            {/* Hover overlay */}
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 hover:bg-black/30 transition-colors">
              {!avatarUploading && (
                <svg className="opacity-0 group-hover:opacity-100 text-white" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              )}
            </span>
          </button>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={avatarUploading}
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
            >
              {avatarUploading ? 'Uploading…' : 'Change photo'}
            </button>
            <p className="text-xs text-slate-400">JPG or PNG, max 5 MB</p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarPick}
          />
        </div>

        {/* Name */}
        <Field label="Display name" error={undefined}>
          <FieldInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={60}
          />
        </Field>

        {/* Bio */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Bio</label>
            <span className={cn('text-xs', bio.length >= 270 ? 'text-amber-500' : 'text-slate-400')}>
              {bio.length}/300
            </span>
          </div>
          <FieldTextarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell buyers a little about yourself — what you sell, where you're based…"
            rows={3}
            maxLength={300}
          />
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="State" error={undefined}>
            <select
              className={inputClassName}
              value={state}
              onChange={(e) => handleStateChange(e.target.value)}
            >
              <option value="">Select state…</option>
              {NG_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="City / LGA" error={undefined}>
            {lgas.length > 0 ? (
              <select
                className={inputClassName}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">Select LGA…</option>
                {lgas.map((lga) => (
                  <option key={lga} value={lga}>{lga}</option>
                ))}
              </select>
            ) : (
              <FieldInput
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={state ? 'Enter city' : 'Select state first'}
                disabled={!state}
              />
            )}
          </Field>
        </div>

        {/* Feedback */}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && (
          <p className="text-sm font-medium text-emerald-700">Profile saved!</p>
        )}

        <Button type="submit" disabled={saving || avatarUploading} className="w-full">
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </div>
  );
}
