import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-ink-700 bg-ink-900 p-5 shadow-lg shadow-black/20 ${className}`}
    >
      {children}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  queued: 'border-ink-600 bg-ink-800 text-ink-300',
  running: 'border-accent-600 bg-accent-600/15 text-accent-400',
  done: 'border-emerald-700 bg-emerald-900/30 text-emerald-300',
  failed: 'border-red-800 bg-red-950/40 text-red-300',
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.queued;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {(status === 'queued' || status === 'running') && (
        <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />
      )}
      {status}
    </span>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-200"
    >
      {children}
    </p>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-400">
      <span
        className="size-3.5 animate-spin rounded-full border-2 border-ink-600 border-t-accent-400"
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return 'just now';

  const units: [number, string][] = [
    [60, 'min'],
    [3600, 'hour'],
    [86400, 'day'],
  ];

  for (let i = units.length - 1; i >= 0; i -= 1) {
    const [size, name] = units[i];
    if (seconds >= size) {
      const n = Math.floor(seconds / size);
      return `${n} ${name}${n === 1 ? '' : 's'} ago`;
    }
  }
  return 'just now';
}

export function formatRange(start: string | null, end: string | null, current: boolean): string {
  if (!start && !end) return current ? 'Present' : '';
  const left = start ?? '?';
  const right = end ?? (current ? 'present' : '?');
  return `${left} — ${right}`;
}
