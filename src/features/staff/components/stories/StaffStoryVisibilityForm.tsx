/**
 * StaffStoryVisibilityForm: "Who can find it": staff show, restrict or hide a story, with a reason
 * (bundle ADMIN-2, part b1; story S1-E11-08 criteria 2 and 3; board AdminStory 8.11).
 *
 * - Shown: as the writer published it.
 * - Restricted (proposal for Robert): it still opens from its link, in libraries and on the
 *   writer's profile, but Discover, shelves, search and tags leave it out.
 * - Hidden: only the writer and staff see it (S1-E10-06).
 * Restricting or hiding sends the writer a statement of reasons (DSA art. 17); showing it again
 * sends a notification. A story a moderation case removed can't be changed here: the case or an
 * appeal brings it back (S1-E10-07).
 * Who shows it: StaffStoryPage, for staff who may change stories. What it calls: the changer from
 * useChangeStaffStory.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Notice } from '@/components/ui/Notice';

import type { StaffStoryOverview } from '../../api/staffStories';
import type { StaffStoryChanger } from '../../hooks/useChangeStaffStory';
import { completeReason, emptyReason } from '../../lib/staffStorySettingsDiff';

import { StoryChangeFeedback } from './StoryChangeFeedback';
import { StoryChangeReasonFields } from './StoryChangeReasonFields';

/** The three states staff can choose here. */
const choices = ['shown', 'restricted', 'hidden'] as const;
type VisibilityChoice = (typeof choices)[number];

/** What the form needs. */
export interface StaffStoryVisibilityFormProps {
  story: StaffStoryOverview;
  changer: StaffStoryChanger;
}

/**
 * Renders the section.
 *
 * @returns the choices, what the chosen one means, the reason and Save
 */
export function StaffStoryVisibilityForm({ story, changer }: StaffStoryVisibilityFormProps) {
  const { t } = useTranslation('staff');
  const current = story.visibility === 'removed' ? 'hidden' : story.visibility;
  const [wanted, setWanted] = useState<VisibilityChoice>(current);
  const [reason, setReason] = useState(emptyReason);
  const [problem, setProblem] = useState<string | null>(null);

  /** Needs a new state and a complete reason, then asks the database. */
  async function save(event: FormEvent) {
    event.preventDefault();
    const complete = completeReason(reason);
    if (complete === null) return setProblem(t('stories.change.reasonMissing'));
    setProblem(null);
    await changer
      .change({ kind: 'visibility', visibility: wanted, reason: complete })
      .then(() => setReason(emptyReason))
      .catch(() => undefined);
  }

  return (
    <section aria-labelledby="story-visibility-heading" className="flex flex-col gap-3">
      <h2
        id="story-visibility-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {t('stories.change.visibilityHeading')}
      </h2>
      {story.visibility === 'removed' ? (
        <Notice tone="info">{t('stories.change.removedByCase')}</Notice>
      ) : (
        <form noValidate onSubmit={(event) => void save(event)} className="flex flex-col gap-3">
          <ChoiceChips
            label={t('stories.change.visibilityLabel')}
            isLabelVisible
            options={choices.map((choice) => ({
              value: choice,
              label: t(`stories.change.visibility.${choice}`),
            }))}
            value={wanted}
            onChange={(value) => setWanted(choices.find((choice) => choice === value) ?? current)}
            description={t(`stories.change.visibilityExplain.${wanted}`)}
            descriptionId="story-visibility-explain"
          />
          <StoryChangeReasonFields
            idPrefix="story-visibility"
            reason={reason}
            onChange={setReason}
            problem={problem}
          />
          <div>
            <Button type="submit" disabled={changer.isBusy || wanted === current}>
              {t('stories.change.saveVisibility')}
            </Button>
          </div>
          <StoryChangeFeedback changer={changer} isMine={(last) => last.kind === 'visibility'} />
        </form>
      )}
    </section>
  );
}
