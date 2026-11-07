/**
 * FoundingMemberPill: "Founding member", the small badge on the profile of everyone who signed up
 * while the waiting list was on (bundle WAITLIST-1; Robert, 6 Nov 2026, 17:27 UTC).
 *
 * Who shows it: ProfileHeader, beside the Teacher badge. An information pill, never a control
 * (DoD pill system: a pastel tint with dark text of the same hue).
 */
import { useTranslation } from 'react-i18next';

import { InfoPill } from '@/components/ui/InfoPill';

/**
 * Renders the pill.
 *
 * @returns the pill
 */
export function FoundingMemberPill() {
  const { t } = useTranslation('account');
  return <InfoPill tone="plum">{t('waitlist.foundingMember')}</InfoPill>;
}
