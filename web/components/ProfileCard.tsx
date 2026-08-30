import type { NormalisedProfile } from '@/lib/types';
import { Card, formatRange } from './ui';

export function ProfileCard({ profile }: { profile: NormalisedProfile }) {
  const name = profile.full_name ?? profile.public_id;

  return (
    <Card>
      <div className="flex flex-col gap-6">
        <header className="flex items-start gap-4">
          {profile.picture_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.picture_url}
              alt=""
              className="size-16 shrink-0 rounded-full border border-ink-700 object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-16 shrink-0 items-center justify-center rounded-full border border-ink-700 bg-ink-800 text-xl font-semibold text-ink-400"
            >
              {name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold text-ink-100">{name}</h2>
            {profile.headline && (
              <p className="mt-0.5 text-sm text-ink-300">{profile.headline}</p>
            )}
            <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-400">
              {profile.location && <span>{profile.location}</span>}
              {profile.industry && <span>{profile.industry}</span>}
              <a
                href={profile.profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-400 hover:underline"
              >
                View on LinkedIn
              </a>
            </p>
          </div>
        </header>

        {profile.summary && (
          <Section title="About">
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-300">
              {profile.summary}
            </p>
          </Section>
        )}

        {profile.positions.length > 0 && (
          <Section title="Experience">
            <ul className="flex flex-col gap-4">
              {profile.positions.map((p, i) => (
                <li key={`${p.company ?? 'role'}-${i}`} className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-ink-100">{p.title ?? 'Unknown role'}</p>
                  <p className="text-sm text-ink-300">
                    {p.company ?? 'Unknown company'}
                    {p.location ? ` · ${p.location}` : ''}
                  </p>
                  <p className="text-xs text-ink-400">
                    {formatRange(p.dates.start, p.dates.end, p.current)}
                  </p>
                  {p.description && (
                    <p className="mt-1 whitespace-pre-line text-sm text-ink-400">{p.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {profile.education.length > 0 && (
          <Section title="Education">
            <ul className="flex flex-col gap-3">
              {profile.education.map((e, i) => (
                <li key={`${e.school ?? 'school'}-${i}`} className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-ink-100">{e.school ?? 'Unknown school'}</p>
                  <p className="text-sm text-ink-300">
                    {[e.degree, e.field].filter(Boolean).join(', ') || '—'}
                  </p>
                  <p className="text-xs text-ink-400">
                    {formatRange(e.dates.start, e.dates.end, false)}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {profile.skills.length > 0 && (
          <Section title="Skills">
            <ul className="flex flex-wrap gap-1.5">
              {profile.skills.map((s) => (
                <li
                  key={s}
                  className="rounded-full border border-ink-700 bg-ink-850 px-2.5 py-0.5 text-xs text-ink-300"
                >
                  {s}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {isEmptyProfile(profile) && (
          <p className="text-sm text-ink-400">
            The fetch succeeded but no profile detail came back. The raw payload is stored
            server-side, so this can be re-normalised without another fetch.
          </p>
        )}
      </div>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-ink-800 pt-4">
      <h3 className="text-xs font-semibold tracking-wide text-ink-400 uppercase">{title}</h3>
      {children}
    </section>
  );
}

function isEmptyProfile(p: NormalisedProfile): boolean {
  return (
    !p.headline &&
    !p.summary &&
    !p.location &&
    p.positions.length === 0 &&
    p.education.length === 0 &&
    p.skills.length === 0
  );
}
