/**
 * SpotlightsSection: "Writer of the week" on the Writers' hub staff page: the picks with each
 * writer's answer, inviting a writer and deleting a pick (bundle GAPS-12e). Every change is in
 * the audit log.
 *
 * Who shows it: StaffHubPage. What it calls: useStaffSpotlights, SpotlightForm and SpotlightItem.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';

import type { HubStaffFailure } from '../../api/hubStaffErrors';
import { useStaffSpotlights } from '../../hooks/useStaffSpotlights';
import { useHubTranslation } from '../../registerHubTranslations';

import { SpotlightForm } from './SpotlightForm';
import { SpotlightItem } from './SpotlightItem';

type SpotlightsState = ReturnType<typeof useStaffSpotlights>;

/**
 * Which words a failed change gets: a refused value and a taken day have this section's own, the
 * others are shared with the page's other sections.
 *
 * @param failure - why the change failed
 * @returns the translation key
 */
function failureKeyFor(failure: HubStaffFailure): string {
  if (failure === 'refused') return 'hubStaff.spotlights.refused';
  if (failure === 'day_taken') return 'hubStaff.spotlights.dayTaken';
  return `hubStaff.failures.${failure}`;
}

/**
 * The list, a wait, or why there is none.
 *
 * @returns the list part
 */
function SpotlightList({ state }: { state: SpotlightsState }) {
  const { t } = useHubTranslation();
  if (state.spotlights.isError) return <Notice tone="error">{t('hubStaff.loadFailed')}</Notice>;
  if (state.spotlights.data === undefined)
    return <p className="m-0 text-meta">{t('hubStaff.loading')}</p>;
  if (state.spotlights.data.length === 0)
    return <p className="m-0 text-body">{t('hubStaff.spotlights.empty')}</p>;
  return (
    <ul
      className="m-0 flex list-none flex-col gap-3 p-0"
      aria-label={t('hubStaff.spotlights.listLabel')}
    >
      {state.spotlights.data.map((spotlight) => (
        <SpotlightItem key={spotlight.id} spotlight={spotlight} state={state} />
      ))}
    </ul>
  );
}

/**
 * Renders the section.
 *
 * @returns the heading, the invite form or its button, any refusal and the list
 */
export function SpotlightsSection() {
  const { t } = useHubTranslation();
  const state = useStaffSpotlights();
  const [isInviting, setIsInviting] = useState(false);
  return (
    <section aria-labelledby="staff-hub-spotlights" className="flex max-w-[720px] flex-col gap-4">
      <h2 id="staff-hub-spotlights" className="m-0 font-heading text-2xl font-bold text-heading">
        {t('hubStaff.spotlights.heading')}
      </h2>
      <p className="m-0 text-body">{t('hubStaff.spotlights.intro')}</p>
      <div aria-live="polite">
        {state.changeFailure !== null && (
          <Notice tone="error">{t(failureKeyFor(state.changeFailure))}</Notice>
        )}
      </div>
      {isInviting ? (
        <Card className="flex flex-col gap-3 p-5">
          <SpotlightForm
            isBusy={state.isChanging}
            onInvite={async (draft) =>
              state.invite.mutateAsync(draft).then(() => setIsInviting(false))
            }
            onCancel={() => setIsInviting(false)}
          />
        </Card>
      ) : (
        <Button className="w-fit" onClick={() => setIsInviting(true)}>
          {t('hubStaff.spotlights.add')}
        </Button>
      )}
      <SpotlightList state={state} />
    </section>
  );
}
