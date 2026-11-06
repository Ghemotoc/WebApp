/**
 * AppealOwnerReview: the note on an appeal that the moderator who made the original decision
 * also decided, because nobody else could, and the owner's "Mark as reviewed" button (QA-7,
 * finding M1; DSA art. 20(6), appeals decided under the supervision of qualified staff).
 *
 * The database decides who may mark it (admin_appeals_queue()'s may_mark_reviewed, true only for
 * an owner); this only shows the button when told it may.
 * Who shows it: AppealCard, for a decided appeal marked decided_by_original_decider.
 * What it calls: onMarkReviewed, which useAppeals sends to admin_mark_appeal_reviewed().
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';

import type { StaffAppeal } from '../api/appeals';

/** What the note needs. */
export interface AppealOwnerReviewProps {
  appeal: StaffAppeal;
  isMarking: boolean;
  onMarkReviewed: () => void;
}

/**
 * Renders the pill, the sentence and, for an owner, the button.
 *
 * @returns the review part of the card
 */
export function AppealOwnerReview({ appeal, isMarking, onMarkReviewed }: AppealOwnerReviewProps) {
  const { t } = useTranslation('moderation');
  return (
    <div className="flex flex-col items-start gap-2">
      <InfoPill tone={appeal.needsOwnerReview ? 'gold' : 'neutral'}>
        {t('appeals.sameDecider')}
      </InfoPill>
      <p className="m-0 text-sm text-body">
        {appeal.needsOwnerReview ? t('appeals.ownerReviewNeeded') : t('appeals.ownerReviewed')}
      </p>
      {appeal.mayMarkReviewed && (
        <Button type="button" variant="secondary" disabled={isMarking} onClick={onMarkReviewed}>
          {isMarking ? t('appeals.marking') : t('appeals.markReviewed')}
        </Button>
      )}
    </div>
  );
}
