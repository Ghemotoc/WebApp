/**
 * useAccountWords: how the Users screens write an account's status, age group, age check and
 * sanctions in the page's language (story S1-E11-02).
 *
 * Who calls it: UserResults and AccountSummaryRows. The texts are in the staff namespace
 * (users.statuses, users.ageBands, users.ageChecks); sanction kinds come from the moderation
 * namespace (S1-E10-06), so both screens name them the same way.
 * Staff see the age group and the age check result and date, never the year of birth
 * (architecture 1.8.3).
 */
import { useTranslation } from 'react-i18next';

import type { Enums } from '@/lib/database.types';

/**
 * The word helpers.
 *
 * @returns status(), ageBand(), ageCheck(), sanctionKinds(), date() and dateTime()
 */
export function useAccountWords() {
  const { t, i18n } = useTranslation('staff');
  const { t: tModeration } = useTranslation('moderation');

  /** A date in the page's language, for example "24 Oct 2026". */
  const date = (isoTime: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(isoTime));

  /** A date and time in the page's language, for staff notes and history (LOGS-1). */
  const dateTime = (isoTime: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(isoTime),
    );

  return {
    date,
    dateTime,
    status: (status: Enums<'account_status'>) => t(`users.statuses.${status}`),
    ageBand: (band: Enums<'age_band'>) => t(`users.ageBands.${band}`),
    // "18 or over · 5 Oct 2026", or only the result while there is no date.
    ageCheck: (result: Enums<'age_check_result'> | null, checkedAt: string | null) => {
      const resultText = t(`users.ageChecks.${result ?? 'pending'}`);
      return checkedAt === null ? resultText : `${resultText} · ${date(checkedAt)}`;
    },
    sanctionKinds: (kinds: Enums<'sanction_kind'>[]) =>
      kinds.length === 0
        ? t('users.noSanctions')
        : kinds.map((kind) => tModeration(`sanctions.kinds.${kind}`)).join(', '),
  };
}
