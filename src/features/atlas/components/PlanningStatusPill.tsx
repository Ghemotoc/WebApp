/**
 * PlanningStatusPill: a chapter's planning status as an information pill, its colour and its
 * words together, never colour alone (stories S1-E17-19 and S1-E17-21; DoD pill system).
 *
 * Who uses it: BoardCard and PovLanesView. What it calls: InfoPill.
 */
import { InfoPill, type PillTone } from '@/components/ui/InfoPill';

import type { PlanningStatus } from '../api/chapterPlans';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** A tone per status, from a grey idea to a green done. */
const statusTones: Record<PlanningStatus, PillTone> = {
  idea: 'neutral',
  outlined: 'sky',
  drafting: 'gold',
  revising: 'blush',
  done: 'sage',
};

/**
 * Renders the pill.
 *
 * @param props.status - the planning status
 * @returns the pill with the status's name
 */
export function PlanningStatusPill({ status }: { status: PlanningStatus }) {
  const { t } = useAtlasTranslation();
  return <InfoPill tone={statusTones[status]}>{t(`chapterPlan.statuses.${status}`)}</InfoPill>;
}
