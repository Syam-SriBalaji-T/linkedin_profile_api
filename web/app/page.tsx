import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/LogoutButton';
import { SearchPanel } from '@/components/SearchPanel';
import { Card, ErrorNote } from '@/components/ui';
import { apiRequest } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import type { HealthResponse, PublicUser, SearchList } from '@/lib/types';

const EMPTY_HISTORY: SearchList = { items: [], total: 0, limit: 20, offset: 0 };

export default async function DashboardPage() {
  const token = await getSessionToken();
  if (!token) redirect('/login');

  const me = await apiRequest<PublicUser>({ path: '/auth/me', token });
  if (!me.ok) {
    if (me.status === 401) redirect('/login');
    return <Unavailable message={me.message} />;
  }

  const [history, health] = await Promise.all([
    apiRequest<SearchList>({ path: '/searches?limit=20&offset=0', token }),
    apiRequest<HealthResponse>({ path: '/health' }),
  ]);

  const sessionInvalid = health.ok && health.data.session_valid === false;
  const notConfigured = health.ok && health.data.session_valid === null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-800 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Unfurl</h1>
          <p className="text-xs text-ink-400">{me.data.email}</p>
        </div>
        <LogoutButton />
      </header>

      {sessionInvalid && (
        <ErrorNote>
          The stored LinkedIn session is no longer valid, so new fetches will fail. Update
          LINKEDIN_LI_AT and LINKEDIN_CSRF_TOKEN in api/.env. Cached profiles still load.
        </ErrorNote>
      )}

      {notConfigured && (
        <ErrorNote>
          No LinkedIn credentials are configured, so fetches cannot run. Set LINKEDIN_LI_AT and
          LINKEDIN_CSRF_TOKEN in api/.env. Cached profiles still load.
        </ErrorNote>
      )}

      {!history.ok && <ErrorNote>Could not load your history: {history.message}</ErrorNote>}

      <SearchPanel initialHistory={history.ok ? history.data : EMPTY_HISTORY} />
    </main>
  );
}

function Unavailable({ message }: { message: string }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Unfurl</h1>
      <Card>
        <p className="text-sm text-ink-300">{message}</p>
        <p className="mt-3 text-xs text-ink-400">
          Check that the api/ service is running and that API_BASE_URL in web/.env points at it.
        </p>
      </Card>
    </main>
  );
}
