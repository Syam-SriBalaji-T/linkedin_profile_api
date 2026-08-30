import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { apiRequest } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import type { PublicUser } from '@/lib/types';

export const metadata = { title: 'Sign in · Unfurl' };

export default async function LoginPage() {
  const token = await getSessionToken();
  if (token) {
    const me = await apiRequest<PublicUser>({ path: '/auth/me', token });
    if (me.ok) redirect('/');
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Unfurl</h1>
        <p className="text-sm text-ink-400">
          Sign in to look up LinkedIn profiles and keep a history of your searches.
        </p>
      </header>

      <AuthForm />
    </main>
  );
}
