/**
 * IdeaItem: one question, idea, to-do or decision on the Ideas page (story S1-E17-28: "it has a
 * done tick-box, editable text and an 'Action or outcome' field"; "when I tick it, then the date
 * it was done is recorded").
 *
 * Its type as a pill (words, not colour alone), the Done tick-box and the date it was done, then
 * its text and "Action or outcome", each saving by itself, its type and Delete (asked twice).
 * Who uses it: IdeasPage. What it calls: the save and remove props (useStoryIdeas).
 */
import { useState } from 'react';

import { InfoPill, type PillTone } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';

import { ideaKinds, type IdeaKind, type StoryIdea, type StoryIdeaChange } from '../api/ideas';
import { useAtlasTranslation } from '../registerAtlasTranslations';

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
  const { t, i18n } = useAtlasTranslation();
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

  const doneDate =
    idea.doneAt === null
      ? null
      : new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
          new Date(idea.doneAt),
        );
  return (
    <>
      <label className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-heading">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={isDone}
          onChange={(changed) => void tick(changed.target.checked)}
        />
        {/* Seen: "Done"; heard: "Done: <the note>", so each box says which note it ticks. */}
        <span aria-hidden="true">{t('ideas.done')}</span>
        <span className="sr-only">{t('ideas.doneNamed', { body: idea.body })}</span>
      </label>
      {doneDate !== null && pendingDone === null && (
        <span className="text-sm text-meta">{t('ideas.doneOn', { date: doneDate })}</span>
      )}
      {hasFailed && <Notice tone="error">{t('ideas.tickFailed')}</Notice>}
    </>
  );
}

/** The type drop-down and Delete, side by side. */
function IdeaActions({ idea, save, remove }: IdeaItemProps) {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <PlanSelectField
        id={`atlas-idea-${idea.id}-kind`}
        label={t('ideas.add.kind')}
        options={ideaKinds.map((option) => ({ value: option, label: t(`ideas.kinds.${option}`) }))}
        savedValue={idea.kind}
        save={async (chosen) => {
          const kind = ideaKinds.find((option) => option === chosen);
          if (kind !== undefined) await save({ kind });
        }}
      />
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
 * Renders the item.
 *
 * @returns the list item with its tick-box, fields and actions
 */
export function IdeaItem(props: IdeaItemProps) {
  const { t } = useAtlasTranslation();
  const { idea, save } = props;
  const idBase = `atlas-idea-${idea.id}`;
  return (
    <li
      data-testid="atlas-idea-item"
      className="flex flex-col gap-3 border-b border-hairline py-5 last:border-b-0"
    >
      <div className="flex flex-wrap items-center gap-3">
        <InfoPill tone={kindTones[idea.kind]}>{t(`ideas.kinds.${idea.kind}`)}</InfoPill>
        <DoneTick idea={idea} save={save} />
      </div>
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
      <IdeaActions {...props} />
    </li>
  );
}
