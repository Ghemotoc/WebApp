/**
 * The one place the front end gets the product's name, website, email addresses and social handle.
 *
 * Story: S1-E1-01. Rule: names and domains are settings, not code (CLAUDE.md, decided 17 Oct 2026, 12:47).
 * "Ghemotoc" is a working name until the name and domain are bought, so renaming the product must be
 * a change to this file (or the VITE_BRAND_* variables) plus the locale files, nothing else.
 *
 * Where things come in from: VITE_BRAND_* environment variables, which Vite copies into the bundle at
 * build time (set them in .env.local or in Cloudflare Pages). When one is missing or empty, today's
 * value below is used (Robert, 17 Oct 2026: fall back to today's values).
 * Where things go: `brand` is read by src/lib/i18n.ts (so every translation can say {{productName}}),
 * by vite.config.ts (the page title in index.html) and by tests. Back-end code never imports this
 * file: it reads the `settings` table (S1-E1-02) or Edge Function secrets instead.
 *
 * The test scripts/find-hard-coded-brand-values.test.ts fails if any of these values is typed anywhere
 * else in src/, supabase/, public/, e2e/ or index.html.
 */

/** Everything the interface may say about the product itself. */
export interface Brand {
  /** The product name shown to people, for example in the page title and the home heading. */
  productName: string;
  /** The website's domain without "https://", for example for links in emails. */
  siteDomain: string;
  /** The full website address, built from siteDomain. */
  siteUrl: string;
  /** Where people write to us about anything (legal pages, Contact us). */
  contactEmail: string;
  /** Where people ask for help with their account. */
  supportEmail: string;
  /**
   * Where people write about their personal data (privacy notice, S1-E14-01). The contact address
   * until the company exists (Robert, 17 Oct 2026, 19:43, Q16).
   */
  privacyEmail: string;
  /**
   * The single point of contact for authorities (DSA art. 11) and for terrorist content removal
   * orders (Regulation (EU) 2021/784, art. 15), shown on the contact page (S1-E14-02). The contact
   * address until the company exists (Robert, 17 Oct 2026, 19:43, Q16).
   */
  authoritiesEmail: string;
  /** The handle we use on social networks, with the leading "@". */
  socialHandle: string;
  /** The company behind the product, for the footer line "An app by …" (S1-E1-03). */
  companyName: string;
}

/**
 * The VITE_BRAND_* variables this file understands. Any of them may be missing.
 * VITE_BRAND_PRIVACY_EMAIL (S1-E14-01) and VITE_BRAND_AUTHORITIES_EMAIL (S1-E14-02) are not yet
 * listed in .env.example: that file is covered by the repository's read-deny rule for .env files,
 * so a session can't edit it (both are on the by-hand lists of those pull requests).
 */
export interface BrandEnvironment {
  VITE_BRAND_NAME?: string;
  VITE_BRAND_SITE_DOMAIN?: string;
  VITE_BRAND_CONTACT_EMAIL?: string;
  VITE_BRAND_SUPPORT_EMAIL?: string;
  VITE_BRAND_PRIVACY_EMAIL?: string;
  VITE_BRAND_AUTHORITIES_EMAIL?: string;
  VITE_BRAND_SOCIAL_HANDLE?: string;
  VITE_BRAND_COMPANY_NAME?: string;
}

/**
 * Today's values, used whenever a variable is not set.
 * Sources: working name "Ghemotoc" (decided 16 Oct 2026); working site and contact and support
 * address (decided 17 Oct 2026, 12:50); the privacy address is the same until the company exists
 * (decided 17 Oct 2026, 19:43, Q16), and so is the authorities' address; handle @ghemotoc everywhere (architecture.md, section 1.2);
 * the footer line "An app by The Magic Coffin" (canvas comment, 16 Oct 2026).
 */
export const brandDefaults: Readonly<Omit<Brand, 'siteUrl'>> = {
  productName: 'Ghemotoc',
  siteDomain: 'ghemotoc.themagiccoffin.com',
  contactEmail: 'hello@themagiccoffin.com',
  supportEmail: 'hello@themagiccoffin.com',
  privacyEmail: 'hello@themagiccoffin.com',
  authoritiesEmail: 'hello@themagiccoffin.com',
  socialHandle: '@ghemotoc',
  companyName: 'The Magic Coffin',
};

/**
 * Returns the variable's value without surrounding spaces, or the fallback when it is missing or blank.
 *
 * @param value - the raw environment value, possibly undefined
 * @param fallback - today's value to use instead
 * @returns the value to use
 */
function valueOrDefault(value: string | undefined, fallback: string): string {
  const trimmedValue = value?.trim() ?? '';
  return trimmedValue === '' ? fallback : trimmedValue;
}

/**
 * Builds the brand from environment variables, falling back to today's values one by one.
 *
 * @param environment - usually `import.meta.env`; undefined when called from Node (vite.config.ts
 *   passes the result of Vite's loadEnv instead)
 * @returns the complete brand; it never throws, because every value has a default
 */
export function readBrand(environment: BrandEnvironment | undefined): Brand {
  // Each value: the variable if it is set, otherwise today's value.
  const siteDomain = valueOrDefault(environment?.VITE_BRAND_SITE_DOMAIN, brandDefaults.siteDomain);

  return {
    productName: valueOrDefault(environment?.VITE_BRAND_NAME, brandDefaults.productName),
    siteDomain,
    // The site is always served over HTTPS (Cloudflare Pages), so the address is built, not configured.
    siteUrl: `https://${siteDomain}`,
    contactEmail: valueOrDefault(environment?.VITE_BRAND_CONTACT_EMAIL, brandDefaults.contactEmail),
    supportEmail: valueOrDefault(environment?.VITE_BRAND_SUPPORT_EMAIL, brandDefaults.supportEmail),
    privacyEmail: valueOrDefault(environment?.VITE_BRAND_PRIVACY_EMAIL, brandDefaults.privacyEmail),
    authoritiesEmail: valueOrDefault(
      environment?.VITE_BRAND_AUTHORITIES_EMAIL,
      brandDefaults.authoritiesEmail,
    ),
    socialHandle: valueOrDefault(environment?.VITE_BRAND_SOCIAL_HANDLE, brandDefaults.socialHandle),
    companyName: valueOrDefault(environment?.VITE_BRAND_COMPANY_NAME, brandDefaults.companyName),
  };
}

/**
 * The brand the running app uses. `import.meta.env` is filled in by Vite in the browser and in tests;
 * outside Vite (plain Node) it is undefined and readBrand falls back to today's values.
 */
export const brand: Brand = readBrand(import.meta.env as BrandEnvironment | undefined);
