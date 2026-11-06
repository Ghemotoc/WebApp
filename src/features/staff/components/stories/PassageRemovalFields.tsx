/**
 * PassageRemovalFields: the chapter's words, read-only, where staff select the exact passage to
 * remove, then the case, the reason and "Remove the passage" (bundle ADMIN-2, part b2; story
 * S1-E11-08 criteria "remove the exact passage" and "staff can't type in the text").
 *
 * The words sit in a read-only text field: staff can select in it with the mouse or with Shift
 * and the arrow keys, and a screen reader reads it, but nobody can type in it (Q14: staff never
 * add to or reword a writer's text). "Use the selected words" copies the selection, so staff see
 * exactly what will go before they confirm.
 * Who shows it: ChapterPassageForm, once the chapter's words have loaded. What it calls: the
 * changer from useChangeStaffStory.
 */
import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';

import type { ChapterPassage } from '../../api/staffStoryChanges';
import type { StaffChapterText } from '../../api/staffStoryHistory';
import type { StaffStoryChange, StaffStoryChanger } from '../../hooks/useChangeStaffStory';
import { selectedPassage } from '../../lib/passageSelection';
import { completeReason, emptyReason } from '../../lib/staffStorySettingsDiff';

import { StoryChangeFeedback } from './StoryChangeFeedback';
import { StoryChangeReasonFields } from './StoryChangeReasonFields';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** What the fields need. */
export interface PassageRemovalFieldsProps {
  chapter: StaffChapterText;
  /** The story's language, so the marker shows as readers will see it. */
  storyLanguage: string;
  changer: StaffStoryChanger;
  onCancel: () => void;
}

/**
 * The selected words, quoted, with what will replace them.
 *
 * @returns the quote and the count
 */
function SelectedWords({ passage, marker }: { passage: ChapterPassage; marker: string }) {
  const { t } = useTranslation('staff');
  return (
    <div className="flex flex-col gap-1">
      <p className="m-0 text-sm font-semibold text-ink">{t('stories.passage.selected')}</p>
      <blockquote className="m-0 border-l-4 border-border pl-3 whitespace-pre-wrap text-body">
        {passage.text}
      </blockquote>
      <p className="m-0 text-sm text-meta">
        {t('stories.passage.selectedCount', { count: passage.text.length, marker })}
      </p>
    </div>
  );
}

/** What the words picker needs. */
interface ChapterWordsPickerProps {
  chapter: StaffChapterText;
  idPrefix: string;
  marker: string;
  passage: ChapterPassage | null;
  /** Called with the selection, or null when nothing but spaces is selected. */
  onPick: (passage: ChapterPassage | null) => void;
}

/**
 * The read-only words, "Use the selected words" and what was picked.
 *
 * @returns the field, the button and the quote
 */
function ChapterWordsPicker({
  chapter,
  idPrefix,
  marker,
  passage,
  onPick,
}: ChapterWordsPickerProps) {
  const { t } = useTranslation('staff');
  const textRef = useRef<HTMLTextAreaElement>(null);

  /** Copies the selection from the read-only field. */
  function takeSelection() {
    const field = textRef.current;
    if (field === null) return onPick(null);
    onPick(selectedPassage(chapter.text, field.selectionStart, field.selectionEnd, ''));
  }

  return (
    <>
      <Textarea
        ref={textRef}
        id={`${idPrefix}-text`}
        label={t('stories.passage.textLabel', { number: chapter.number })}
        hint={t('stories.passage.textHint')}
        readOnly
        rows={12}
        value={chapter.text}
      />
      <div>
        <Button variant="secondary" onClick={takeSelection}>
          {t('stories.passage.useSelection')}
        </Button>
      </div>
      {passage !== null && <SelectedWords passage={passage} marker={marker} />}
    </>
  );
}

/**
 * "Remove the passage" and Cancel.
 *
 * @returns the two buttons
 */
function PassageButtons({ isBusy, onCancel }: { isBusy: boolean; onCancel: () => void }) {
  const { t } = useTranslation('staff');
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" variant="destructive" disabled={isBusy}>
        {t('stories.passage.confirm')}
      </Button>
      <Button variant="secondary" onClick={onCancel}>
        {t('stories.change.cancel')}
      </Button>
    </div>
  );
}

/**
 * Renders the words and the form.
 *
 * @returns the form
 */
export function PassageRemovalFields(props: PassageRemovalFieldsProps) {
  const { chapter, storyLanguage, changer, onCancel } = props;
  const { t } = useTranslation('staff');
  const [passage, setPassage] = useState<ChapterPassage | null>(null);
  const [caseReference, setCaseReference] = useState('');
  const [reason, setReason] = useState(emptyReason);
  const [problem, setProblem] = useState<string | null>(null);
  const idPrefix = `passage-${chapter.chapterId}`;
  const marker = t('stories.passage.marker', { lng: storyLanguage });

  /** Keeps what staff picked, or says nothing was selected. */
  function pick(chosen: ChapterPassage | null) {
    setPassage(chosen);
    setProblem(chosen === null ? t('stories.passage.nothingSelected') : null);
  }

  /** Needs a selection and a complete reason, then asks the database. */
  async function confirm(event: FormEvent) {
    event.preventDefault();
    const complete = completeReason(reason);
    if (passage === null) return setProblem(t('stories.passage.nothingSelected'));
    if (complete === null) return setProblem(t('stories.change.reasonMissing'));
    setProblem(null);
    const wanted = { ...passage, caseReference: caseReference.trim() };
    await changer
      .change({ kind: 'passage', chapterId: chapter.chapterId, passage: wanted, reason: complete })
      .then(() => setPassage(null))
      .catch(errorShownByHook);
  }

  const isMine = (last: StaffStoryChange) =>
    last.kind === 'passage' && last.chapterId === chapter.chapterId;
  return (
    <form noValidate onSubmit={(event) => void confirm(event)} className="flex flex-col gap-3">
      <p className="m-0 text-body">{t('stories.passage.explain')}</p>
      <ChapterWordsPicker
        chapter={chapter}
        idPrefix={idPrefix}
        marker={marker}
        passage={passage}
        onPick={pick}
      />
      <TextInput
        id={`${idPrefix}-case`}
        label={t('stories.passage.caseLabel')}
        hint={t('stories.passage.caseHint')}
        value={caseReference}
        onChange={(event) => setCaseReference(event.target.value)}
      />
      <StoryChangeReasonFields
        idPrefix={idPrefix}
        reason={reason}
        onChange={setReason}
        problem={problem}
      />
      <PassageButtons isBusy={changer.isBusy} onCancel={onCancel} />
      <StoryChangeFeedback changer={changer} isMine={isMine} />
    </form>
  );
}
