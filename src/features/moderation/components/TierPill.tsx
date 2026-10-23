/**
 * TierPill: "1 hour", "Same day", "48 hours" or "7 days" on a case (story S1-E10-03a).
 *
 * Information pill (the pill system, Definition of Done): a pastel tint with dark text, never
 * colour alone: the words say the tier. Board 8.2 tints the one-hour and same-day tiers red and
 * pink, 48 hours gold and 7 days grey; here blush, blush, gold and neutral.
 * Who shows it: CaseRow, CasePage.
 */
import { useTranslation } from 'react-i18next';

import { InfoPill, type PillTone } from '@/components/ui/InfoPill';

import type { CaseTier } from '../api/moderationQueue';

/** The tone per tier, from the most urgent down. */
const toneOf: Record<CaseTier, PillTone> = {
  one_hour: 'blush',
  same_day: 'blush',
  two_days: 'gold',
  seven_days: 'neutral',
};

/**
 * Renders the pill.
 *
 * @param props.tier - the case's tier
 * @returns the pill with the tier's name
 */
export function TierPill({ tier }: { tier: CaseTier }) {
  const { t } = useTranslation('moderation');
  return <InfoPill tone={toneOf[tier]}>{t(`tiers.${tier}`)}</InfoPill>;
}
