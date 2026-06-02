import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <main className="container flex min-h-dvh flex-col items-center justify-center gap-6 py-16">
      <div className="w-full max-w-sm space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Login form is wired up in a later phase.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        No account?{' '}
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Register
        </Link>
      </p>
    </main>
  );
}
