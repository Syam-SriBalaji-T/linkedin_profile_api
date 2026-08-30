import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { AnyNode } from 'domhandler';
import {
  PROFILE_SCHEMA_VERSION,
  type Education,
  type Experience,
  type ExperienceRole,
  type NormalisedProfile,
} from './profile.types';

const clean = (s: string | undefined | null): string => (s ?? '').replace(/\s+/g, ' ').trim();
const nullify = (s: string): string | null => (s ? s : null);

/** Reads img src, preferring the lazy-loaded data-delayed-url used on mobile. */
function imageUrl($: CheerioAPI, el: AnyNode | undefined): string | null {
  if (!el) return null;
  const $el = $(el);
  return $el.attr('src') ?? $el.attr('data-delayed-url') ?? null;
}

/** Finds a <section> by its exact <h2> title. */
function sectionByTitle($: CheerioAPI, title: string): AnyNode | undefined {
  let found: AnyNode | undefined;
  $('section').each((_, s) => {
    if (!found && clean($(s).find('h2').first().text()) === title) found = s;
  });
  return found;
}

const DATE_RE = /\b(19|20)\d{2}\b|present/i;

/**
 * Only the outermost entries in a section. LinkedIn nests a second
 * <li class="profile-entity-lockup"> inside each entry, so a naive find()
 * returns every experience/education row twice.
 */
function outermostEntries($: CheerioAPI, section: AnyNode): AnyNode[] {
  return $(section)
    .find('li.profile-entity-lockup')
    .filter((_, el) => $(el).parents('li.profile-entity-lockup').length === 0)
    .toArray();
}

/** Splits "2015 - Present · 11 yrs 8 mos" into the range and the duration. */
function splitDates(raw: string): { date_range: string | null; duration: string | null } {
  const text = clean(raw);
  const durationMatch = text.match(/(\d+\s*yrs?(\s*\d+\s*mos?)?|\d+\s*mos?)\s*$/i);
  if (durationMatch) {
    const duration = clean(durationMatch[0]);
    const range = clean(text.slice(0, durationMatch.index).replace(/·\s*$/, ''));
    return { date_range: nullify(range), duration: nullify(duration) };
  }
  return { date_range: nullify(text), duration: null };
}

function parseExperience($: CheerioAPI): Experience[] {
  const section = sectionByTitle($, 'Experience');
  if (!section) return [];

  const out: Experience[] = [];
  for (const entry of outermostEntries($, section)) {
    const $e = $(entry);
    const logo = imageUrl($, $e.find('img').first()[0]);
    const link = $e.find('a[href*="/company/"]').first().attr('href');
    const companyUrl = link ? link.split('?')[0] : null;
    const heading = clean($e.find('.list-item-heading, .body-medium-bold').first().text());

    const roleContainers = $e.find('li.role-container');
    if (roleContainers.length > 0) {
      // Grouped: one company, several roles. The heading is the company.
      const roles: ExperienceRole[] = [];
      roleContainers.each((_, rc) => {
        const title = clean($(rc).find('.body-small-bold').first().text());
        const dates = clean(
          $(rc)
            .find('div.body-small')
            .filter((__, d) => DATE_RE.test($(d).text()))
            .first()
            .text(),
        );
        if (title) roles.push({ title, ...splitDates(dates) });
      });
      out.push({ company: nullify(heading), company_url: companyUrl, logo_url: logo, roles });
    } else {
      // Single role: the heading is the title; company + dates are sub-lines.
      let company: string | null = null;
      let dates = '';
      $e.find('div.body-small').each((_, d) => {
        const t = clean($(d).text());
        if (!t) return;
        if (!dates && DATE_RE.test(t)) {
          dates = t;
        } else if (!company && !DATE_RE.test(t) && !/see (more|less)/i.test(t)) {
          company = t;
        }
      });
      out.push({
        company,
        company_url: companyUrl,
        logo_url: logo,
        roles: [{ title: nullify(heading), ...splitDates(dates) }],
      });
    }
  }
  return out;
}

function parseEducation($: CheerioAPI): Education[] {
  const section = sectionByTitle($, 'Education');
  if (!section) return [];

  const out: Education[] = [];
  for (const entry of outermostEntries($, section)) {
    const $e = $(entry);
    const school = clean($e.find('.list-item-heading, .body-medium-bold').first().text());
    if (!school) continue;

    let degree: string | null = null;
    $e.find('div.body-small').each((_, d) => {
      const t = clean($(d).text());
      if (!degree && t && t !== school && !DATE_RE.test(t) && !/see (more|less)/i.test(t)) {
        degree = t;
      }
    });

    const link = $e.find('a[href*="/school/"]').first().attr('href');
    out.push({
      school,
      degree,
      school_url: link ? link.split('?')[0] : null,
      logo_url: imageUrl($, $e.find('img').first()[0]),
    });
  }
  return out;
}

/** A simple bulleted section (Skills, Languages, Certifications) when present. */
function parseListSection($: CheerioAPI, title: string): string[] {
  const section = sectionByTitle($, title);
  if (!section) return [];
  const items = new Set<string>();
  $(section)
    .find('li')
    .each((_, li) => {
      const heading = clean($(li).find('.list-item-heading, .body-medium-bold').first().text());
      const text = heading || clean($(li).find('[dir="ltr"]').first().text());
      if (text) items.add(text);
    });
  return [...items];
}

function parseTopCard($: CheerioAPI): {
  name: string | null;
  headline: string | null;
  location: string | null;
  followers: string | null;
  picture_url: string | null;
  background_url: string | null;
} {
  const name = clean($('h1.heading-large').first().text());

  const headline = clean(
    $('.body-small.text-color-text').not('.text-color-text-low-emphasis').first().text(),
  );

  let location: string | null = null;
  let followers: string | null = null;
  $('.body-small.text-color-text-low-emphasis').each((_, d) => {
    const $d = $(d);
    if (location === null && $d.find('.member-connection-info').length) {
      followers = nullify(clean($d.find('.member-connection-info').text()));
      const loc = $d
        .clone()
        .find('.member-connection-info, .dot-separator, .following-msg, .not-following-msg')
        .remove()
        .end()
        .text();
      location = nullify(clean(loc));
    }
  });

  const picture_url = imageUrl($, $('img[alt^="Profile picture of"]').first()[0]);

  // The cover/banner carries aria-label="Member Background Photo".
  const bg = $('img[aria-label="Member Background Photo"]').first();
  const background_url = bg.length ? imageUrl($, bg[0]) : null;

  return {
    name: nullify(name),
    headline: nullify(headline),
    location,
    followers,
    picture_url,
    background_url,
  };
}

function parseAbout($: CheerioAPI): string | null {
  const section = sectionByTitle($, 'About');
  if (!section) return null;
  const text = clean($(section).clone().find('h2').remove().end().text())
    .replace(/…?\s*See more\s*(See less\s*)?$/i, '')
    .trim();
  return nullify(text);
}

/**
 * Parses LinkedIn's mobile server-rendered profile HTML into a NormalisedProfile.
 * Every field degrades to null / empty when its section is absent, so a profile
 * that hides a section yields a partial result rather than an error.
 */
export function parseProfileHtml(
  html: string,
  publicId: string,
  profileUrl: string,
): NormalisedProfile {
  const $ = cheerio.load(html);
  const top = parseTopCard($);

  return {
    public_id: publicId,
    profile_url: profileUrl,
    ...top,
    about: parseAbout($),
    experience: parseExperience($),
    education: parseEducation($),
    skills: parseListSection($, 'Skills'),
    certifications: [
      ...parseListSection($, 'Licenses & certifications'),
      ...parseListSection($, 'Certifications'),
    ],
    languages: parseListSection($, 'Languages'),
    schema_version: PROFILE_SCHEMA_VERSION,
  };
}
