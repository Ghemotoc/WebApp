/**
 * TeacherBadgePill: "Teacher badge · pending" while a request waits, or "Teacher" once granted
 * (story S1-E2-11; board Onboarding 2.5, step 3: the gold pill).
 *
 * Who shows it: SentNote, TeacherBadgeSection and the writer profile's header (ProfileHeader).
 * An information pill, never a control (DoD pill system).
 */
import { useTranslation } from 'react-i18next';

import { InfoPill } from '@/components/ui/InfoPill';

/**
 * Renders the pill.
 *
 * @param props.isPending - true for "Teacher badge · pending", false for "Teacher"
 * @returns the pill
 */
export function TeacherBadgePill({ isPending }: { isPending: boolean }) {
  const { t } = useTranslation('account');
  if (isPending) return <InfoPill tone="gold">{t('teacherBadge.pending')}</InfoPill>;
  return <InfoPill tone="sage">{t('teacherBadge.teacher')}</InfoPill>;
}
