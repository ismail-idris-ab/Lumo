'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { registerSchema, type RegisterInput } from '@lumo/shared';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Field, FieldInput } from '@/components/ui/field';

export function RegisterForm() {
  const { register: signup } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get('next') || '/dashboard';
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterInput) {
    setError(null);
    try {
      // Strip empty optional phone so it doesn't fail the regex.
      await signup({ ...values, phone: values.phone || undefined });
      router.push(next);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Registration failed');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4">
      <Field label="Name" error={errors.name?.message}>
        <FieldInput autoComplete="name" {...register('name')} />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <FieldInput type="email" autoComplete="email" {...register('email')} />
      </Field>
      <Field label="Phone (optional)" error={errors.phone?.message}>
        <FieldInput type="tel" placeholder="0801 234 5678" {...register('phone')} />
      </Field>
      <Field label="Password" error={errors.password?.message}>
        <FieldInput type="password" autoComplete="new-password" {...register('password')} />
      </Field>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
