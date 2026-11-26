/**
 * IdeaItem: one question, idea, to-do or decision on the Ideas page (story S1-E17-28; redrawn by
 * user stories bundle 6, story 6.12, board E31: "Tick a note to mark it done; it shows “Done on 2
 * Nov” and the outcome the writer added (Action or outcome) … Delete (the bin) takes the note away
 * with “Removed. Undo” for 8 seconds. The type is a word in bold, never colour alone").
 *
 * A plain row between hairlines: the Done tick-box, then the type as a bold word, the note (in the
 * muted colour once done) with its [[Name]] links as links (S1-E17-31), and once done "Done on 2
 * Nov." with the outcome. At the end a pen opens the note's text, "Action or outcome" and type in
 * place, each saving by itself, with Done to close them (the board draws no way to write the
 * outcome, which the story asks for; docs/board-fixes.md), and the bin deletes it at once and
 * offers Undo in the shared note (design books item 14).
 * Who uses it: IdeasPage. What it calls: the save, remove, putBack and onRemoved props
 * (useStoryIdeas), useUndo, CrossLinkText and CrossLinkChips.
 */
import { useState } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { dateLocaleFor, withShortSeptember } from '@/lib/romania-time';
import { useUndo } from '@/lib/undo/useUndo';
import { cn } from '@/lib/utils';

import {
  ideaKinds,
  type RemovedStoryIdea,
  type StoryIdea,
  type StoryIdeaChange,
} from '../api/ideas';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CrossLinkChips } from './CrossLinkChips';
import { CrossLinkText } from './CrossLinkText';
import { PlanSelectField } from './PlanSelectField';
import { PlanTextField } from './PlanTextField';

/** What the item needs. */
export interface IdeaItemProps {
  idea: StoryIdea;
  save: (change: StoryIdeaChange) => Promise<void>;
  /** Deletes the note and hands back the removed row; throws when it can't. */
  remove: () => Promise<RemovedStoryIdea>;
  /** Puts the removed row back (Undo); throws when it can't. */
  putBack: (removed: RemovedStoryIdea) => Promise<void>;
  /** Called once the note is deleted, so the focus has somewhere to go. */
  onRemoved: () => void;
}

/** The round 44 px quiet icon button at the end of a row (board E31's gh-iconbtn). */
const iconButtonClass =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-heading hover:bg-tint aria-pressed:bg-tint';

/** The Done tick-box: 20 px as board E31 draws it, inside a 24 px target (rule 9). */
function DoneTick({ idea, save }: Pick<IdeaItemProps, 'idea' | 'save'>) {
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
    <div className="flex flex-none flex-col">
      <label className="inline-flex size-6 items-center justify-center">
        <input
          type="checkbox"
          className="size-5 accent-primary"
          checked={isDone}
          aria-label={t('ideas.doneNamed', { body: idea.body })}
          onChange={(changed) => void tick(changed.target.checked)}
        />
      </label>
      {hasFailed && <Notice tone="error">{t('ideas.tickFailed')}</Notice>}
    </div>
  );
}

/** The note as it reads: the type in bold, the words, and "Done on 2 Nov." with the outcome. */
function IdeaReading({ idea }: { idea: StoryIdea }) {
  const { t, i18n } = useAtlasTranslation();
  const isDone = idea.doneAt !== null;
  // Board E31: "Done on 2 Nov." (the day and the short month, British order in English), then
  // the outcome.
  const doneDate = isDone
    ? withShortSeptember(
        new Intl.DateTimeFormat(dateLocaleFor(i18n.language), {
          day: 'numeric',
          month: 'short',
        }).format(new Date(idea.doneAt ?? '')),
      )
    : null;
  return (
    <>
      <p className="m-0 type-meta font-semibold text-ink">{t(`ideas.kinds.${idea.kind}`)}</p>
      {/* A done note is muted and also says "Done on …", so it isn't shown by colour alone
          (WCAG 1.4.1). */}
      <p
        data-testid="atlas-idea-body"
        className={cn('m-0 type-body break-words', isDone ? 'text-ink-muted' : 'text-ink')}
      >
        <CrossLinkText text={idea.body} />
      </p>
      {doneDate !== null && (
        <p className="m-0 type-meta break-words whitespace-pre-line text-ink-muted">
          {t('ideas.doneOn', { date: doneDate })}
          {idea.outcome !== '' && ' '}
          {idea.outcome !== '' && <CrossLinkText text={idea.outcome} />}
        </p>
      )}
      {!isDone && idea.outcome !== '' && (
        <p className="m-0 type-meta break-words whitespace-pre-line text-ink-muted">
          <CrossLinkText text={idea.outcome} />
        </p>
      )}
    </>
  );
}

/** The note's fields, each saving by itself: its words, "Action or outcome" and its type. */
function IdeaEditor({
  idea,
  save,
  onDone,
}: Pick<IdeaItemProps, 'idea' | 'save'> & { onDone: () => void }) {
  const { t } = useAtlasTranslation();
  const idBase = `atlas-idea-${idea.id}`;
  return (
    <div className="mt-2 flex min-w-0 flex-col gap-3">
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
      <CrossLinkChips texts={[idea.body, idea.outcome]} />
      <Button variant="secondary" className="self-start" onClick={onDone}>
        {t('ideas.closeEditor')}
      </Button>
    </div>
  );
}

/**
 * Deletes the note at once and offers Undo in the shared note, or says plainly that it couldn't.
 *
 * @returns whether the last delete failed, and the delete itself
 */
function useDeleteWithUndo({ remove, putBack, onRemoved }: IdeaItemProps) {
  const { t } = useAtlasTranslation();
  const { offerUndo } = useUndo();
  const [hasFailed, setHasFailed] = useState(false);
  async function deleteNow() {
    setHasFailed(false);
    // Step 1: delete; on a failure the row stays and says so.
    let removed: RemovedStoryIdea;
    try {
      removed = await remove();
    } catch {
      setHasFailed(true);
      return;
    }
    // Step 2: the row is gone, so the focus moves on, and the note offers Undo for 8 seconds.
    onRemoved();
    offerUndo({ message: t('ideas.removed'), undo: async () => putBack(removed) });
  }
  return { hasFailed, deleteNow };
}

/**
 * Renders one note as a row of the list.
 *
 * @returns the list item, with its fields while it is being edited
 */
export function IdeaItem(props: IdeaItemProps) {
  const { t } = useAtlasTranslation();
  const { idea, save } = props;
  const [isEditing, setIsEditing] = useState(false);
  const { hasFailed, deleteNow } = useDeleteWithUndo(props);
  return (
    <li
      id={`atlas-idea-${idea.id}`}
      data-testid="atlas-idea-item"
      className="flex items-start gap-3 border-t border-hairline py-3"
    >
      <DoneTick idea={idea} save={save} />
      <div className="flex min-w-0 flex-1 flex-col">
        <IdeaReading idea={idea} />
        {isEditing && <IdeaEditor idea={idea} save={save} onDone={() => setIsEditing(false)} />}
        <div aria-live="polite">
          {hasFailed && <Notice tone="error">{t('ideas.deleteFailed')}</Notice>}
        </div>
      </div>
      <div className="-mt-2 flex flex-none">
        <button
          type="button"
          className={iconButtonClass}
          aria-pressed={isEditing}
          aria-label={t('ideas.editNamed', { body: idea.body })}
          onClick={() => setIsEditing(!isEditing)}
        >
          <ActionIcon name="pen" size={22} />
        </button>
        <button
          type="button"
          className={iconButtonClass}
          aria-label={t('ideas.deleteNamed', { body: idea.body })}
          onClick={() => void deleteNow()}
        >
          <ActionIcon name="bin" size={22} />
        </button>
      </div>
    </li>
  );
}
