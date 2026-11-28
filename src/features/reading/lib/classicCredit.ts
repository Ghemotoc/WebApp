/**
 * Under which licence a classic's text came to us (bundle CLASSIC-CREDIT; Robert, 28 Nov 2026,
 * 05:30 UTC, asked for the source and licence on every classic's page, and at 05:37 UTC for "just
 * the license and the source (hyperlinked)", without a line on why it is free).
 *
 * `classicSourceLicence()` works out the licence from the host of the source link. The three
 * sources the classics loads use each publish one licence for all their texts: Wikisource
 * (CC BY-SA 4.0), Standard Ebooks (CC0) and Project Gutenberg Australia (public-domain
 * transcriptions). Reading the host is sturdier than reading the edition's title.
 * Who uses it: StorySideColumn's ClassicCredit (the "About this story" author card).
 * What it calls: nothing.
 */

/** The licence a source publishes its texts under, with the page that explains it. */
export interface ClassicSourceLicence {
  /** Which words to show: a licence name, or the public-domain transcription line. */
  kind: 'cc-by-sa-4' | 'cc0' | 'public-domain-transcription';
  /** The licence's own page, or null when there is none to link to. */
  url: string | null;
}

/** The hosts each licence covers, a subdomain included ("ro.wikisource.org"). */
const LICENCES_BY_HOST: { host: string; licence: ClassicSourceLicence }[] = [
  {
    host: 'wikisource.org',
    licence: { kind: 'cc-by-sa-4', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  },
  {
    host: 'standardebooks.org',
    licence: { kind: 'cc0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  },
  { host: 'gutenberg.net.au', licence: { kind: 'public-domain-transcription', url: null } },
];

/**
 * The licence of a classic's source, from the host of its link.
 *
 * @param sourceUrl - the edition's link, or null for a classic added before the staff form
 * @returns the licence, or null for no link, a broken link or a source not on the list
 */
export function classicSourceLicence(sourceUrl: string | null): ClassicSourceLicence | null {
  // Step 1: no link, no licence to work out.
  if (sourceUrl === null) return null;
  // Step 2: read the host; a link that isn't a real address gives no licence.
  let host: string;
  try {
    host = new URL(sourceUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
  // Step 3: the host itself or any subdomain of it counts.
  const match = LICENCES_BY_HOST.find(
    (entry) => host === entry.host || host.endsWith(`.${entry.host}`),
  );
  return match === undefined ? null : match.licence;
}
