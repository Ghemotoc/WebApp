/**
 * InviteStatusPill: Active, Used up, Expired or Revoked on an invite link (story S1-E11-17).
 *
 * Information pill (the pill system, Definition of Done): a pastel tint with dark text, never
 * colour alone: the word says the state. Who shows it: InviteRow.
 */
import { useTranslation } from 'react-i18next';

import { InfoPill, type PillTone } from '@/components/ui/InfoPill';

import type { InviteStatus } from '../../api/inviteLinks';

/** The tone per status: sage for live, neutral for finished, blush for revoked. */
const toneOf: Record<InviteStatus, PillTone> = {
  active: 'sage',
  used_up: 'neutral',
  expired: 'neutral',
  revoked: 'blush',
};

/**
 * Renders the pill.
 *
 * @param props.status - the link's status
 * @returns the pill with the status word
 */
export function InviteStatusPill({ status }: { status: InviteStatus }) {
  const { t } = useTranslation('staff');
  return <InfoPill tone={toneOf[status]}>{t(`invites.status.${status}`)}</InfoPill>;
}
