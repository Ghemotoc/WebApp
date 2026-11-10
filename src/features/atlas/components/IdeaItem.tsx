/**
 * IdeaItem: one question, idea, to-do or decision on the Ideas page (story S1-E17-28: "it has a
 * done tick-box, editable text and an 'Action or outcome' field"; "when I tick it, then the date
 * it was done is recorded").
 *
 * A row in the glass list (board AtlasIdeas, bundle G10c3): the Done tick-box, the type as a pill
 * (words, not colour alone), the day it was done, the note (struck through once done) and its
 * outcome, with the [[Name]] links in them as chips (S1-E17-28, S1-E17-31). "Edit" opens the
 * note's text, "Action or outcome" and type, each saving by itself; Delete asks twice.
 * Who uses it: IdeasPage. What it calls: the save and remove props (useStoryIdeas) and
 * CrossLinkChips.
 */
import { useState } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { InfoPill, type PillTone } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import { cn } from '@/lib/utils';

import { ideaKinds, type IdeaKind, type StoryIdea, type StoryIdeaChange } from '../api/ideas';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CrossLinkChips } from './CrossLinkChips';
import { PlanSelectField } from './PlanSelectField';
import { PlanTextField } from './PlanTextField';
import { TwoStepDelete } from './TwoStepDelete';

/** Each type's pill colour (the pill system's tints; the pill's words carry the meaning). */
const kindTones: Record<IdeaKind, PillTone> = {
  question: 'sky',
  idea: 'gold',
  todo: 'sage',
  decision: 'plum',
};

/** What the item needs. */
export interface IdeaItemProps {
  idea: StoryIdea;
  save: (change: StoryIdeaChange) => Promise<void>;
  remove: () => Promise<void>;
}

/** The Done tick-box and, once ticked, the date it was done. */
function DoneTick({ idea, save }: Omit<IdeaItemProps, 'remove'>) {
  const { t } = useAtlasTranslation();
  // While a tick saves, the box shows the writer's choice instead of the last saved state.
  const [pendingDone, setPendingDone] = useState<boolean | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const isDone = pendingDone ?? idea.doneAt !== null;

  /** Saves the tick; the database records the date (S1-E17-28). */
  async function tick(checked: boolean) {
    setHasFailed(false);
    setPendingDone(checked);
    await save({ is_done: checked }).catch(() => setHasFailed(true));
    setPendingDone(null);
  }

  return (
    <>
      <label className="inline-flex h-11 w-11 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          className="h-6 w-6"
          checked={isDone}
          onChange={(changed) => void tick(changed.target.checked)}
        />
        {/* Heard as "Done: <the note>", so each box says which note it ticks. */}
        <span className="sr-only">{t('ideas.doneNamed', { body: idea.body })}</span>
      </label>
      {hasFailed && <Notice tone="error">{t('ideas.tickFailed')}</Notice>}
    </>
  );
}

/** The note as it reads: its type, the day it was done, the words and the outcome. */
function IdeaReading({ idea }: { idea: StoryIdea }) {
  const { t, i18n } = useAtlasTranslation();
  const doneDate =
    idea.doneAt === null
      ? null
      : new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
          new Date(idea.doneAt),
        );
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-2.5">
      <p className="m-0 flex flex-wrap items-center gap-2">
        <InfoPill tone={kindTones[idea.kind]}>{t(`ideas.kinds.${idea.kind}`)}</InfoPill>
        {doneDate !== null && (
          <span className="text-[13px] text-meta">{t('ideas.doneOn', { date: doneDate })}</span>
        )}
      </p>
      {/* A done note is struck through and also says "Done on …", so it isn't shown by the line
          alone (WCAG 1.4.1). */}
      <p
        data-testid="atlas-idea-body"
        className={cn(
          'm-0 text-[15px] font-bold break-words text-heading',
          idea.doneAt !== null && 'line-through opacity-70',
        )}
      >
        {idea.body}
      </p>
      {idea.outcome !== '' && (
        <p className="m-0 text-sm break-words whitespace-pre-line text-body">{idea.outcome}</p>
      )}
      <CrossLinkChips texts={[idea.body, idea.outcome]} />
    </div>
  );
}

/** The note's fields, each saving by itself: its words, "Action or outcome" and its type. */
function IdeaEditor({ idea, save }: Omit<IdeaItemProps, 'remove'>) {
  const { t } = useAtlasTranslation();
  const idBase = `atlas-idea-${idea.id}`;
  return (
    <div className="flex min-w-0 flex-col gap-3 border-t border-hairline pt-3">
      <PlanTextField
        id={`${idBase}-body`}
        label={t('ideas.body')}
        savedValue={idea.body}
        maxLength={1000}
        isValid={(typed) => typed.trim() !== ''}
        invalidMessage={t('ideas.add.empty')}
        save={async (typed) => save({ body: typed })}
      />
      <PlanTextField
        id={`${idBase}-outcome`}
        label={t('ideas.outcome')}
        hint={t('ideas.outcomeHint')}
        savedValue={idea.outcome}
        isMultiline
        maxLength={2000}
        save={async (typed) => save({ outcome: typed })}
      />
      <PlanSelectField
        id={`${idBase}-kind`}
        label={t('ideas.add.kind')}
        options={ideaKinds.map((option) => ({ value: option, label: t(`ideas.kinds.${option}`) }))}
        savedValue={idea.kind}
        save={async (chosen) => {
          const kind = ideaKinds.find((option) => option === chosen);
          if (kind !== undefined) await save({ kind });
        }}
      />
    </div>
  );
}

/** Edit (opens the fields) and Delete (asked twice), each named with the note for screen readers. */
function IdeaActions({
  idea,
  remove,
  isEditing,
  onToggle,
}: Pick<IdeaItemProps, 'idea' | 'remove'> & { isEditing: boolean; onToggle: () => void }) {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex flex-wrap items-start gap-2">
      <Button
        variant="secondary"
        aria-pressed={isEditing}
        aria-label={t('ideas.editNamed', { body: idea.body })}
        onClick={onToggle}
      >
        <ActionIcon name="pen" size={16} />
        {t('ideas.edit')}
      </Button>
      <TwoStepDelete
        buttonLabel={t('ideas.delete')}
        buttonAccessibleName={t('ideas.deleteNamed', { body: idea.body })}
        question={t('ideas.confirmDelete', { body: idea.body })}
        yesLabel={t('ideas.yes')}
        keepLabel={t('ideas.keep')}
        failedMessage={t('ideas.deleteFailed')}
        onDelete={async () => {
          await remove();
          return null;
        }}
      />
    </div>
  );
}

/**
 * Renders one note as a row of the glass list.
 *
 * @param props.idea - the note
 * @param props.save - saves a change to it; throws when it can't
 * @param props.remove - deletes it; throws when it can't
 * @returns the list item
 */
export function IdeaItem({ idea, save, remove }: IdeaItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  return (
    <li
      id={`atlas-idea-${idea.id}`}
      data-testid="atlas-idea-item"
      className="flex min-w-0 flex-col gap-3 border-b border-border px-3 py-3 last:border-b-0 sm:px-[18px]"
    >
      <div className="flex min-w-0 flex-wrap items-start gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 basis-64 items-start gap-2">
          <DoneTick idea={idea} save={save} />
          <IdeaReading idea={idea} />
        </div>
        <IdeaActions
          idea={idea}
          remove={remove}
          isEditing={isEditing}
          onToggle={() => setIsEditing(!isEditing)}
        />
      </div>
      {isEditing && <IdeaEditor idea={idea} save={save} />}
    </li>
  );
}
