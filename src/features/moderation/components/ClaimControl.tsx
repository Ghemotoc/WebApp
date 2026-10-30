/**
 * ClaimControl: "Claim this case" / "Release" on the case page, and who has it (story S1-E10-03b;
 * architecture 1.8.4: "A moderator claims a case; others see it is claimed").
 *
 * A claim lasts an hour (the setting case_claim_minutes): after that anyone may take the case
 * over, so a forgotten claim never blocks a deadline. Anyone who acts on cases may still decide a
 * claimed case: the claim tells colleagues, it doesn't lock.
 * Who shows it: CasePage, for an open case. What it calls: useCaseClaim.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { QueueCase } from '../api/moderationQueue';
import { useCaseClaim } from '../hooks/useCaseClaim';

/**
 * Renders the line and the button.
 *
 * @param props.theCase - the case
 * @returns the control
 */
export function ClaimControl({ theCase }: { theCase: QueueCase }) {
  const { t } = useTranslation('moderation');
  const { claim, release, isBusy, failure } = useCaseClaim(theCase.id);
  let line = t('claims.nobody');
  if (theCase.claimedByMe) line = t('claims.mine');
  else if (theCase.claimedByHandle !== null)
    line = t('claims.someone', { handle: theCase.claimedByHandle });
  return (
    <section
      aria-labelledby="claim-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
    >
      <h2 id="claim-heading" className="m-0 font-heading text-lg font-bold text-heading">
        {t('claims.heading')}
      </h2>
      <p className="m-0 text-body" aria-live="polite">
        {line}
      </p>
      <div className="flex flex-wrap gap-3">
        {!theCase.claimedByMe && (
          <Button variant="secondary" onClick={claim} disabled={isBusy}>
            {theCase.claimedByHandle === null ? t('claims.claim') : t('claims.takeOver')}
          </Button>
        )}
        {theCase.claimedByHandle !== null && (
          <Button variant="secondary" onClick={release} disabled={isBusy}>
            {t('claims.release')}
          </Button>
        )}
      </div>
      {failure === 'refused' && <Notice tone="error">{t('claims.refused')}</Notice>}
      {failure !== null && failure !== 'refused' && (
        <Notice tone="error">{t(`failures.${failure}`)}</Notice>
      )}
    </section>
  );
}
