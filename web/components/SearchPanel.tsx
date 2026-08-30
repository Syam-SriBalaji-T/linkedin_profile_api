'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { SearchList, SearchView } from '@/lib/types';
import { HistoryList } from './HistoryList';
import { ProfileCard } from './ProfileCard';
import { Card, ErrorNote, Spinner, StatusBadge, relativeTime } from './ui';

const POLL_INTERVAL_MS = 1_500;
const POLL_TIMEOUT_MS = 90_000;

export function SearchPanel({ initialHistory }: { initialHistory: SearchList }) {
  const [url, setUrl] = useState('');
  const [refresh, setRefresh] = useState(false);
  const [current, setCurrent] = useState<SearchView | null>(null);
  const [history, setHistory] = useState<SearchView[]>(initialHistory.items);
  const [total, setTotal] = useState(initialHistory.total);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pollGeneration = useRef(0);

  useEffect(() => {
    return () => {
      pollGeneration.current += 1;
    };
  }, []);

  const reloadHistory = useCallback(async (): Promise<void> => {
    const res = await fetch('/api/searches?limit=20', { cache: 'no-store' });
    if (!res.ok) return;
    const data = (await res.json()) as SearchList;
    setHistory(data.items);
    setTotal(data.total);
  }, []);

  const pollUntilSettled = useCallback(
    async (jobId: string, generation: number): Promise<void> => {
      const deadline = Date.now() + POLL_TIMEOUT_MS;

      while (generation === pollGeneration.current && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (generation !== pollGeneration.current) return;

        const res = await fetch(`/api/searches/${jobId}`, { cache: 'no-store' });
        if (!res.ok) {
          const body: unknown = await res.json().catch(() => null);
          setError(readMessage(body, 'Lost track of that search.'));
          return;
        }

        const view = (await res.json()) as SearchView;
        if (generation !== pollGeneration.current) return;

        setCurrent(view);

        if (view.status === 'done' || view.status === 'failed') {
          if (view.status === 'failed' && view.error) setError(view.error);
          await reloadHistory();
          return;
        }
      }

      if (generation === pollGeneration.current) {
        setError('This search is taking longer than expected. Check the history for its status.');
      }
    },
    [reloadHistory],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setError(null);
    setBusy(true);
    setCurrent(null);

    pollGeneration.current += 1;
    const generation = pollGeneration.current;

    try {
      const res = await fetch('/api/searches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: trimmed, refresh }),
      });

      const body: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setError(readMessage(body, 'That search could not be started.'));
        return;
      }

      const view = body as SearchView;
      setCurrent(view);
      await reloadHistory();

      if (view.status === 'queued' || view.status === 'running') {
        await pollUntilSettled(view.job_id, generation);
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  const openFromHistory = useCallback(
    async (jobId: string): Promise<void> => {
      setError(null);
      pollGeneration.current += 1;
      const generation = pollGeneration.current;

      const res = await fetch(`/api/searches/${jobId}`, { cache: 'no-store' });
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        setError(readMessage(body, 'Could not load that search.'));
        return;
      }

      const view = (await res.json()) as SearchView;
      setCurrent(view);
      if (view.status === 'failed' && view.error) setError(view.error);

      if (view.status === 'queued' || view.status === 'running') {
        await pollUntilSettled(view.job_id, generation);
      }
    },
    [pollUntilSettled],
  );

  const pending = current?.status === 'queued' || current?.status === 'running';

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label htmlFor="profile-url" className="text-sm font-medium text-ink-300">
            LinkedIn profile
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="profile-url"
              name="url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="linkedin.com/in/username — or just the username"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600"
            />
            <button
              type="submit"
              disabled={busy || !url.trim()}
              className="rounded-lg bg-accent-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-ink-400"
            >
              {busy ? 'Searching…' : 'Search'}
            </button>
          </div>

          <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-ink-400">
            <input
              type="checkbox"
              checked={refresh}
              onChange={(e) => setRefresh(e.target.checked)}
              className="size-3.5 accent-accent-500"
            />
            Bypass the cache and refetch
          </label>
        </form>
      </Card>

      {error && <ErrorNote>{error}</ErrorNote>}

      {current && (
        <section className="flex flex-col gap-3" aria-live="polite">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={current.status} />
            <span className="text-sm text-ink-300">{current.public_id}</span>
            {current.from_cache && (
              <span className="rounded-full border border-ink-700 bg-ink-850 px-2 py-0.5 text-xs text-ink-400">
                from cache
              </span>
            )}
            {current.finished_at && (
              <span className="text-xs text-ink-400">{relativeTime(current.finished_at)}</span>
            )}
          </div>

          {pending && (
            <Card>
              <Spinner
                label={
                  current.status === 'queued'
                    ? 'Queued — waiting for a worker to pick this up…'
                    : 'Fetching the profile from LinkedIn…'
                }
              />
            </Card>
          )}

          {current.status === 'done' && current.profile && (
            <ProfileCard profile={current.profile} />
          )}

          {current.status === 'done' && !current.profile && (
            <Card>
              <p className="text-sm text-ink-400">
                This search finished but the profile could not be loaded.
              </p>
            </Card>
          )}
        </section>
      )}

      <HistoryList
        items={history}
        total={total}
        onOpen={openFromHistory}
        activeJobId={current?.job_id ?? null}
      />
    </div>
  );
}

function readMessage(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === 'string' && m) return m;
    if (Array.isArray(m) && m.length > 0) return m.join(', ');
  }
  return fallback;
}
