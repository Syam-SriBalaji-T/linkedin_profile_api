'use client';

import type { SearchView } from '@/lib/types';
import { Card, StatusBadge, relativeTime } from './ui';

export function HistoryList({
  items,
  total,
  onOpen,
  activeJobId,
}: {
  items: SearchView[];
  total: number;
  onOpen: (jobId: string) => void;
  activeJobId: string | null;
}) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="history-heading">
      <div className="flex items-baseline justify-between">
        <h2 id="history-heading" className="text-sm font-semibold tracking-wide text-ink-400 uppercase">
          History
        </h2>
        {total > 0 && (
          <span className="text-xs text-ink-400">
            {items.length} of {total}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <p className="text-sm text-ink-400">
            No searches yet. Look up a profile above and it will appear here.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const isActive = item.job_id === activeJobId;
            return (
              <li key={item.job_id}>
                <button
                  type="button"
                  onClick={() => onOpen(item.job_id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                    isActive
                      ? 'border-accent-600 bg-accent-600/10'
                      : 'border-ink-700 bg-ink-900 hover:border-ink-600 hover:bg-ink-850'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink-100">
                      {item.public_id}
                    </span>
                    <span className="block truncate text-xs text-ink-400">
                      {relativeTime(item.created_at)}
                      {item.status === 'failed' && item.error ? ` · ${item.error}` : ''}
                    </span>
                  </span>
                  <StatusBadge status={item.status} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
