/**
 * PlanGuardPill: "Shows from chapter 3" on an item in the writer's preview (story S1-E17-35).
 *
 * The preview shows every item, so the writer can check them all; this pill says which ones a
 * reader sees only after a chapter. Readers never see it: their answer leaves those items out
 * until they get there. Who uses it: the readers' area components. What it calls: InfoPill.
 */
import { InfoPill } from '@/components/ui/InfoPill';

import type { PlanGuard } from '../api/publicPlan';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the pill, or nothing for an item without a guard.
 *
 * @param props.guard - the chapter the item waits for, or null
 * @returns the pill or nothing
 */
export function PlanGuardPill({ guard }: { guard: PlanGuard | null | undefined }) {
  const { t } = useAtlasTranslation();
  if (guard === null || guard === undefined) return null;
  return (
    <InfoPill tone="sky">
      {t('publicPlan.guard', { number: guard.position, title: guard.title })}
    </InfoPill>
  );
}
