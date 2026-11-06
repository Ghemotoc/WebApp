/**
 * AgesByCountryTable: every country's age to join and age below which a parent or guardian must
 * agree, under the privacy notice and the terms (bundle MARKETS-1, story S1-E2-23, criterion 3).
 *
 * Generated from the age rules by country, so it changes the moment staff save a rule. A region
 * with its own law (Quebec) has its own row; "Any other country" is the strictest default. The
 * table sits in a region that scrolls sideways on a narrow screen, so the page itself never does.
 * Who shows it: CountryLegalSections.
 */
import { useTranslation } from 'react-i18next';

import { placeName, type AgeRule } from '@/lib/age-rules';

/**
 * Renders the table.
 *
 * @param props.rules - every rule
 * @returns the table
 */
export function AgesByCountryTable({ rules }: { rules: AgeRule[] }) {
  const { t, i18n } = useTranslation('legal');
  const collator = new Intl.Collator(i18n.language);
  const rows = rules
    .map((rule) => ({ rule, name: placeName(rule, i18n.language, t('country.defaultName')) }))
    .sort((first, second) => collator.compare(first.name, second.name));
  return (
    <div
      role="region"
      aria-label={t('country.agesHeading')}
      tabIndex={0}
      className="max-w-full overflow-x-auto"
    >
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{t('country.agesHeading')}</caption>
        <thead>
          <tr className="border-b border-border text-left text-meta">
            <th scope="col" className="py-2 pr-4 font-semibold">
              {t('country.columns.place')}
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold">
              {t('country.columns.join')}
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold">
              {t('country.columns.consent')}
            </th>
            <th scope="col" className="py-2 font-semibold">
              {t('country.columns.blocked')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ rule, name }) => (
            <tr key={rule.id} className="border-b border-border">
              <th scope="row" className="py-2 pr-4 text-left font-normal text-body">
                {name}
              </th>
              <td className="py-2 pr-4">{rule.minimumAge}</td>
              <td className="py-2 pr-4">{rule.parentalConsentBelow}</td>
              <td className="py-2">{rule.signupBlockedBelow ?? t('country.never')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
