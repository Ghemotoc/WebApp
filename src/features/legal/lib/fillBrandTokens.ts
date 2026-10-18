/**
 * Fills the brand tokens in a stored legal text from the brand config (story S1-E14-01).
 *
 * Why: names, addresses and the company are settings, not code (CLAUDE.md, decided 17 Oct 2026,
 * 12:47), so scripts/build-legal-migration.ts stores {{productName}} and friends instead of the
 * values. Renaming the product changes src/config/brand.ts, and every legal text follows.
 * Who calls it: LegalDocumentView, before parsing and showing a version.
 */
import type { Brand } from '@/config/brand';

/**
 * An email address as a Markdown link, so people can write straight from the page (S1-E14-02:
 * until the report form and Contact us exist, the contact points are email links).
 *
 * @param address - the address
 * @returns "[address](mailto:address)"
 */
const emailLink = (address: string) => `[${address}](mailto:${address})`;

/** Each token and the brand value it stands for. */
const tokenValues: { token: string; value: (brand: Brand) => string }[] = [
  { token: '{{productName}}', value: (brand) => brand.productName },
  { token: '{{companyName}}', value: (brand) => brand.companyName },
  { token: '{{contactEmail}}', value: (brand) => emailLink(brand.contactEmail) },
  { token: '{{supportEmail}}', value: (brand) => emailLink(brand.supportEmail) },
  { token: '{{privacyEmail}}', value: (brand) => emailLink(brand.privacyEmail) },
  { token: '{{authoritiesEmail}}', value: (brand) => emailLink(brand.authoritiesEmail) },
];

/**
 * Replaces every brand token with its value.
 *
 * Email addresses become mailto links, so fill a title only when it holds no address (none does).
 *
 * @param text - a stored title or body
 * @param brand - the brand config (src/config/brand.ts)
 * @returns the text people read; the {{afterTheInvitedTest}} marker is left for LegalMarkdown
 */
export function fillBrandTokens(text: string, brand: Brand): string {
  let filled = text;
  for (const { token, value } of tokenValues) {
    filled = filled.split(token).join(value(brand));
  }
  return filled;
}
