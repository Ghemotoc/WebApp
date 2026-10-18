/**
 * CountryRow: "Country: Romania · From your connection" in Settings › Account (story S1-E2-10;
 * board 6.3).
 *
 * The country is never asked: it comes from the connection at sign-up (decided 16 Oct 2026, Q20).
 * Someone who thinks it is wrong can ask support to correct it (story proposal); until Contact us
 * exists (S1-E14-04) the link is an email to the support address in src/config/brand.ts.
 * Who shows it: AccountNamesSection. It uses LabelRows, the label-and-value rows of the DoD.
 */
import { useTranslation } from 'react-i18next';

import { LabelRows } from '@/components/ui/LabelRows';
import { brand } from '@/config/brand';

/**
 * Renders the row.
 *
 * @param props.countryCode - the two-letter code, or null when unknown
 * @returns the row and its note
 */
export function CountryRow({ countryCode }: { countryCode: string | null }) {
  const { t, i18n } = useTranslation('account');
  const countryName =
    countryCode === null
      ? undefined
      : new Intl.DisplayNames([i18n.language], { type: 'region' }).of(countryCode);
  const value =
    countryName === undefined ? t('country.unknown') : t('country.value', { country: countryName });
  return (
    <div className="flex flex-col gap-2">
      <LabelRows rows={[{ label: t('country.label'), value }]} />
      <p className="m-0 text-[13px] text-meta">
        {t('country.note')}{' '}
        <a href={`mailto:${brand.supportEmail}`} className="text-link underline">
          {t('country.contact')}
        </a>
      </p>
    </div>
  );
}
