/**
 * CountryLegalSections: "Your country" and "Ages by country" under the privacy notice and the terms
 * of use (bundle MARKETS-1, story S1-E2-23).
 *
 * The main notice shows for everyone; under it, two sections the reader opens:
 * - "Your country: <name>": for a signed-in reader, the country on their account; signed out, the
 *   country of the connection (useVisitorCountry). When staff published a help page with the
 *   address "legal-your-country" for that country's market and the reader's language, its text
 *   shows here (Website › Help pages, editable per country and language, criterion 2). Otherwise
 *   the ages that apply there are said in words, from the age rules by country.
 * - "Ages by country": every rule's age to join and age below which a parent must agree,
 *   generated from Staff › Settings › Age rules by country (criterion 3).
 * Both are <details> elements, so they open by keyboard and screen readers say so.
 * Who shows it: LegalDocumentView, for the privacy notice and the terms.
 * What it calls: useVisitorCountry, useAgeRules and useWebsiteContent.
 */
import { useTranslation } from 'react-i18next';

import { useAgeRules } from '@/features/auth/hooks/useAgeRules';
import { countryName } from '@/features/safety/lib/countries';
import { useVisitorCountry } from '@/features/safety/hooks/useVisitorCountry';
import { CmsMarkdown } from '@/features/website/components/CmsMarkdown';
import { useWebsiteContent } from '@/features/website/hooks/useWebsiteContent';
import { ruleFor, type AgeRule } from '@/lib/age-rules';
import { helpPageContentSchema } from '@/schemas/websiteContent';

import { AgesByCountryTable } from './AgesByCountryTable';

/** The help page address staff use for a country's own legal section. */
export const countryLegalEntryKey = 'legal-your-country';

/** The classes of each <details> box, so both look the same. */
const detailsClasses =
  'rounded-card border border-border bg-surface p-5 [&_summary]:cursor-pointer [&_summary]:font-heading [&_summary]:text-[20px] [&_summary]:font-bold [&_summary]:text-heading';

/**
 * The ages that apply in a place, in sentences.
 *
 * @returns the paragraphs
 */
function RuleInWords({ rule, place }: { rule: AgeRule; place: string }) {
  const { t } = useTranslation('legal');
  return (
    <div className="mt-3 flex flex-col gap-2 text-body">
      <p className="m-0">
        {t('country.joinFrom', { place, age: rule.minimumAge })}{' '}
        {rule.parentalConsentBelow > rule.minimumAge
          ? t('country.consentBelow', { age: rule.parentalConsentBelow })
          : t('country.noConsent')}
      </p>
      {rule.signupBlockedBelow !== null && (
        <p className="m-0">{t('country.blockedBelow', { age: rule.signupBlockedBelow })}</p>
      )}
      {rule.status === 'to_verify' && <p className="m-0 text-meta">{t('country.toVerify')}</p>}
    </div>
  );
}

/**
 * "Your country": the CMS text for the reader's country when there is one, else the rule.
 *
 * @returns the section
 */
function YourCountry({ country, rules }: { country: string | null; rules: AgeRule[] }) {
  const { t, i18n } = useTranslation('legal');
  const pages = useWebsiteContent('help_page', helpPageContentSchema);
  // Only a page written for this very country: the content falls back to Romania's market for
  // other visitors, which would be the wrong law.
  const own = pages.entries.find(
    (page) => page.entryKey === countryLegalEntryKey && page.marketCode === country,
  );
  const rule = ruleFor(rules, country);
  const place = country === null ? t('country.yourCountry') : countryName(country, i18n.language);
  return (
    <details className={detailsClasses}>
      <summary>{t('country.heading', { place })}</summary>
      {own !== undefined && (
        <div className="mt-3">
          <CmsMarkdown markdown={own.content.body} language={own.languageCode} />
        </div>
      )}
      {own === undefined && rule !== undefined && <RuleInWords rule={rule} place={place} />}
    </details>
  );
}

/**
 * Renders both sections.
 *
 * @returns "Your country" and "Ages by country"
 */
export function CountryLegalSections() {
  const { t } = useTranslation('legal');
  const { countryCode } = useVisitorCountry();
  const rules = useAgeRules().data ?? [];
  return (
    <div className="flex flex-col gap-4">
      <YourCountry country={countryCode} rules={rules} />
      <details className={detailsClasses}>
        <summary>{t('country.agesHeading')}</summary>
        <p className="mt-3 mb-3 text-body">{t('country.agesIntro')}</p>
        <AgesByCountryTable rules={rules} />
      </details>
    </div>
  );
}
