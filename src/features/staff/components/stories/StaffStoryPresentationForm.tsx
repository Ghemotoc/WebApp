/**
 * StaffStoryPresentationForm: "Title and cover": staff hide a story's title or cover from readers,
 * or show it again, with a reason (bundle ADMIN-2, part b3; story S1-E11-08 criterion "hide the
 * cover or the title"; board AdminStory 8.11).
 *
 * - A hidden title: readers see "Title hidden by the moderation team", in the story's language,
 *   until the writer changes the title. Staff never write a new title (decided 16 Oct 2026, Q14).
 * - A hidden cover: readers see the automatic cover (S1-E3-13) until the writer picks another.
 * Hiding sends the writer a statement of reasons (DSA art. 17); showing again sends a
 * notification. A story with the automatic cover has no cover to hide.
 * Who shows it: StaffStoryPage, for staff who may change stories. What it calls: the changer from
 * useChangeStaffStory.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import type { StaffStoryOverview } from '../../api/staffStories';
import type { StoryPresentationPart } from '../../api/staffStoryChanges';
import type { StaffStoryChange, StaffStoryChanger } from '../../hooks/useChangeStaffStory';
import { completeReason, emptyReason } from '../../lib/staffStorySettingsDiff';

import { StoryChangeFeedback } from './StoryChangeFeedback';
import { StoryChangeReasonFields } from './StoryChangeReasonFields';

/** What one part's row needs. */
interface PresentationPartProps {
  part: StoryPresentationPart;
  isHidden: boolean;
  /** False when there is nothing to hide (the automatic cover) and it isn't hidden. */
  canHide: boolean;
  changer: StaffStoryChanger;
}

/**
 * Which sentence describes the part: hidden, shown, or the automatic cover with nothing to hide.
 *
 * @param isHidden - whether staff hid it
 * @param canHide - whether there is anything to hide
 * @returns the key under stories.presentation.<part>
 */
function partState(isHidden: boolean, canHide: boolean): 'hidden' | 'shown' | 'automatic' {
  if (isHidden) return 'hidden';
  return canHide ? 'shown' : 'automatic';
}

/**
 * One part: what readers see now, then Hide or Show; once pressed, the reason and the confirm.
 *
 * @returns the row
 */
function PresentationPart({ part, isHidden, canHide, changer }: PresentationPartProps) {
  const { t } = useTranslation('staff');
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState(emptyReason);
  const [problem, setProblem] = useState<string | null>(null);
  const wanted = isHidden ? 'shown' : 'hidden';
  const action = t(`stories.presentation.${part}.${isHidden ? 'show' : 'hide'}`);
  const isMine = (last: StaffStoryChange) => last.kind === 'presentation' && last.part === part;

  /** Needs a complete reason, then asks the database. */
  async function confirm(event: FormEvent) {
    event.preventDefault();
    const complete = completeReason(reason);
    if (complete === null) return setProblem(t('stories.change.reasonMissing'));
    setProblem(null);
    await changer
      .change({ kind: 'presentation', part, state: wanted, reason: complete })
      .then(() => {
        setIsOpen(false);
        setReason(emptyReason);
      })
      .catch(() => undefined);
  }

  const state = partState(isHidden, canHide);
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <h3 className="m-0 text-base font-semibold text-heading">
        {t(`stories.presentation.${part}.label`)}
      </h3>
      <p className="m-0 text-body">{t(`stories.presentation.${part}.${state}`)}</p>
      {isOpen ? (
        <form noValidate onSubmit={(event) => void confirm(event)} className="flex flex-col gap-3">
          <StoryChangeReasonFields
            idPrefix={`presentation-${part}`}
            reason={reason}
            onChange={setReason}
            problem={problem}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={changer.isBusy}>
              {action}
            </Button>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              {t('stories.change.cancel')}
            </Button>
          </div>
        </form>
      ) : (
        (isHidden || canHide) && (
          <div>
            <Button variant="secondary" onClick={() => setIsOpen(true)}>
              {action}
            </Button>
          </div>
        )
      )}
      <StoryChangeFeedback changer={changer} isMine={isMine} />
    </div>
  );
}

/** What the section needs. */
export interface StaffStoryPresentationFormProps {
  story: StaffStoryOverview;
  changer: StaffStoryChanger;
}

/**
 * Renders the section.
 *
 * @returns the heading, what hiding means and one row each for the title and the cover
 */
export function StaffStoryPresentationForm({ story, changer }: StaffStoryPresentationFormProps) {
  const { t } = useTranslation('staff');
  return (
    <section aria-labelledby="story-presentation-heading" className="flex flex-col gap-3">
      <h2
        id="story-presentation-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {t('stories.presentation.heading')}
      </h2>
      <p className="m-0 text-body">{t('stories.presentation.intro')}</p>
      <PresentationPart part="title" isHidden={story.titleHidden} canHide changer={changer} />
      <PresentationPart
        part="cover"
        isHidden={story.coverHidden}
        canHide={story.cover.coverKind !== 'automatic'}
        changer={changer}
      />
    </section>
  );
}
