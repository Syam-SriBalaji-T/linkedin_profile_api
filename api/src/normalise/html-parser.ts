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
  // LinkedIn renders a single-role entry as an outer li.profile-entity-lockup
  // wrapping an identical inner one (class `sub-group`). .find() matches at any
  // depth, so an unfiltered selector returns every experience twice. Keep only
  // the outermost lockups.
  $(section)
    .find('li.profile-entity-lockup')
    .filter((_, li) => $(li).parents('li.profile-entity-lockup').length === 0)
    .each((_, li) => {
      const $li = $(li);
      const link = $li.find('a[href*="/company/"]').first().attr('href');
      const company_url = link ? link.split('?')[0] : null;
      const logo_url = imageUrl($, $li.find('img').first()[0]);
      const $heading = $li.find('.list-item-heading, .body-medium-bold').first();
      const roleContainers = $li.find('li.role-container');

      if (roleContainers.length) {
        // Grouped entry (several roles at one company): the heading is the
        // company name and each li.role-container holds one role.
        const company = clean($heading.text());
        if (!company) return;
        const roles: ExperienceRole[] = [];
        roleContainers.each((__, r) => {
          const $r = $(r);
          const title = clean($r.find('.body-small-bold').first().text());
          const dates = clean($r.find('.body-small').not('.body-small-bold').first().text());
          if (title) roles.push({ title, ...splitDates(dates) });
        });
        out.push({ company, company_url, logo_url, roles });
        return;
      }

      // Single-role entry: the heading is the ROLE title, the first .body-small
      // sibling after it is the company, and the second holds the dates.
      const title = clean($heading.text());
      const details = $heading.nextAll('.body-small');
      const company = clean(details.eq(0).text());
      const dates = clean(details.eq(1).text());
      if (!company && !title) return;
      out.push({
        company: company || title,
        company_url,
        logo_url,
        roles: title ? [{ title, ...splitDates(dates) }] : [],
      });
    });
  return out;
}

function parseEducation($: CheerioAPI): Education[] {
  const section = sectionByTitle($, 'Education');
  if (!section) return [];

  const out: Education[] = [];
  $(section)
    .find('li.profile-entity-lockup')
    .each((_, li) => {
      const $li = $(li);
      const school = clean($li.find('.list-item-heading, .body-medium-bold').first().text());
      if (!school) return;
      const degree = clean($li.find('.body-small').not('.body-small-bold').first().text());
      const link = $li.find('a[href*="/school/"]').first().attr('href');
      out.push({
        school,
        degree: nullify(degree),
        school_url: link ? link.split('?')[0] : null,
        logo_url: imageUrl($, $li.find('img').first()[0]),
      });
    });
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
