/**
 * ReviewQueue: every campaign waiting for review, oldest first (story S1-E12-02 criterion 2;
 * board AdminSponsors "Review queue").
 *
 * It sends each card's decision and shows the outcome above the cards, because an approved or
 * sent-back campaign leaves the queue as soon as the list is read again.
 * Who shows it: StaffSponsorsPage. What it calls: useSponsorChanges() and ReviewCard.
 */
import { Notice } from '@/components/ui/Notice';
import type { StaffCampaign } from '@/schemas/sponsors';

import { useSponsorChanges } from '../../hooks/useSponsorsAdmin';
import { useSponsorTranslation } from '../../registerSponsorTranslations';

import { ChangeOutcome } from './ChangeOutcome';
import { ReviewCard } from './ReviewCard';
import { errorShownByHook } from '@/lib/errorShownByHook';

/**
 * Renders the queue.
 *
 * @returns the section
 */
export function ReviewQueue({ campaigns }: { campaigns: StaffCampaign[] }) {
  const { t } = useSponsorTranslation();
  const changes = useSponsorChanges();
  // Step 1: only campaigns sent for review, in the order they arrived.
  const waiting = campaigns.filter((campaign) => campaign.state === 'in_review').reverse();
  // Step 2: the words for the last decision.
  const lastDecision = changes.lastChange?.kind === 'review' ? changes.lastChange.decision : null;
  const successText = lastDecision === 'approve' ? t('review.approved') : t('review.sentBack');
  return (
    <section aria-labelledby="sponsor-review-heading" className="flex flex-col gap-3">
      <h2
        id="sponsor-review-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('review.heading')}
      </h2>
      <p className="m-0 text-body">{t('review.intro')}</p>
      <ChangeOutcome successText={successText} isDone={changes.isDone} failure={changes.failure} />
      {waiting.length === 0 ? (
        <p className="m-0 text-body">{t('review.empty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {waiting.map((campaign) => (
            <ReviewCard
              key={campaign.id}
              campaign={campaign}
              isRunning={changes.isRunning}
              onDecide={(review) =>
                void changes.change({ kind: 'review', ...review }).catch(errorShownByHook)
              }
            />
          ))}
        </ul>
      )}
      <Notice tone="info">{t('review.lawNote')}</Notice>
    </section>
  );
}
