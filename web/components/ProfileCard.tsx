import type { NormalisedProfile } from '@/lib/types';
import { Card } from './ui';

export function ProfileCard({ profile }: { profile: NormalisedProfile }) {
  const name = profile.name ?? profile.public_id;

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
            {profile.headline && <p className="mt-0.5 text-sm text-ink-300">{profile.headline}</p>}
            <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-400">
              {profile.location && <span>{profile.location}</span>}
              {profile.followers && <span>{profile.followers}</span>}
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

        {profile.about && (
          <Section title="About">
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-300">
              {profile.about}
            </p>
          </Section>
        )}

        {profile.experience.length > 0 && (
          <Section title="Experience">
            <ul className="flex flex-col gap-4">
              {profile.experience.map((exp, i) => (
                <li key={`${exp.company ?? 'company'}-${i}`} className="flex gap-3">
                  {exp.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={exp.logo_url}
                      alt=""
                      className="mt-0.5 size-8 shrink-0 rounded border border-ink-700 object-contain"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-100">{exp.company ?? 'Unknown company'}</p>
                    <ul className="mt-1 flex flex-col gap-1.5">
                      {exp.roles.map((role, j) => (
                        <li key={j}>
                          <p className="text-sm text-ink-200">{role.title ?? 'Unknown role'}</p>
                          <p className="text-xs text-ink-400">
                            {[role.date_range, role.duration].filter(Boolean).join(' · ')}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {profile.education.length > 0 && (
          <Section title="Education">
            <ul className="flex flex-col gap-3">
              {profile.education.map((edu, i) => (
                <li key={`${edu.school ?? 'school'}-${i}`} className="flex gap-3">
                  {edu.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={edu.logo_url}
                      alt=""
                      className="mt-0.5 size-8 shrink-0 rounded border border-ink-700 object-contain"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-100">{edu.school ?? 'Unknown school'}</p>
                    {edu.degree && <p className="text-sm text-ink-300">{edu.degree}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {profile.skills.length > 0 && (
          <Section title="Skills">
            <ul className="flex flex-wrap gap-1.5">
              {profile.skills.map((s) => (
                <li key={s} className="rounded-full border border-ink-700 bg-ink-850 px-2.5 py-0.5 text-xs text-ink-300">
                  {s}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {profile.certifications.length > 0 && (
          <Section title="Certifications">
            <ul className="flex flex-col gap-1 text-sm text-ink-300">
              {profile.certifications.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </Section>
        )}

        {profile.languages.length > 0 && (
          <Section title="Languages">
            <ul className="flex flex-wrap gap-1.5">
              {profile.languages.map((l) => (
                <li key={l} className="rounded-full border border-ink-700 bg-ink-850 px-2.5 py-0.5 text-xs text-ink-300">
                  {l}
                </li>
              ))}
            </ul>
          </Section>
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
