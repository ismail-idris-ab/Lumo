import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <main className="container flex min-h-[70vh] flex-col items-center justify-center gap-6 py-16">
      <div className="w-full max-w-sm space-y-1 text-center">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="text-sm text-muted-foreground">Sell and connect with buyers across Nigeria.</p>
      </div>
      <Suspense>
        <RegisterForm />
      </Suspense>
      <p className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
