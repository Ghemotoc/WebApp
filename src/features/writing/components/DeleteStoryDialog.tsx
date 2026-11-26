/**
 * DeleteStoryDialog: "Delete <title>?", as board D12 draws it (BOOKS D12, user story 5.12): a
 * dialog in the middle of the screen (a sheet from the bottom on phones) that says what goes,
 * for how long Undo can bring it back, and asks for the title to be typed before it deletes.
 *
 * What it shows: the title as the heading with Close ×; one line ("It disappears from <site>
 * straight away: 6 chapters, its comments and its place in readers' bookshelves. For 30 days it
 * waits in Recently deleted on Writing, where Undo brings everything back. After that it is gone
 * for good."); "Type the title to delete it" with "Type <title>" under it; then "Delete the
 * story" and "Keep the story" on the left (design books item 8).
 * Rules: the story is hidden at once and purged after 30 days (S1-E3-05, content_purge_days);
 * the button stays pressable and, pressed before the title matches, says so beside the field
 * (design books item 9, useMissingField).
 * Who shows it: DeleteStoryControl. What it calls: Sheet, TextInput, useMissingField; the delete
 * itself is the caller's (useStoryActions → delete_my_story()).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { Notice } from '@/components/ui/Notice';
import { Sheet } from '@/components/ui/Sheet';
import { TextInput } from '@/components/ui/TextInput';
import { useMissingField } from '@/lib/forms/useMissingField';

import type { MyStory } from '../api/stories';

/** What the dialog needs. */
export interface DeleteStoryDialogProps {
  story: MyStory;
  isOpen: boolean;
  /** True while the delete is on its way; the button waits. */
  isDeleting: boolean;
  /** True when the last delete failed, so the dialog says so. */
  hasFailed: boolean;
  onClose: () => void;
  onDelete: () => void;
}

/** The id of the title field, so a press before the title matches can move the focus there. */
const titleFieldId = 'delete-story-title';

/**
 * Whether what was typed is the title: spaces at the ends and capitals don't count, so a writer
 * who types "stația meteo " for "Stația meteo" can still delete it.
 *
 * @returns true when they match
 */
function typedTitleMatches(typed: string, title: string): boolean {
  return typed.trim().toLocaleLowerCase() === title.trim().toLocaleLowerCase();
}

/**
 * Renders the dialog.
 *
 * @returns the sheet, or nothing while it is closed
 */
export function DeleteStoryDialog(props: DeleteStoryDialogProps) {
  const { story, isOpen, isDeleting, hasFailed, onClose, onDelete } = props;
  const { t } = useTranslation('writing');
  const [typed, setTyped] = useState('');
  const missing = useMissingField(!typedTitleMatches(typed, story.title), titleFieldId);
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      placement="centre"
      title={t('deleteStory.dialogTitle', { title: story.title })}
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 type-body text-ink">
          {t('deleteStory.dialogBody', { count: story.chapters.length })}
        </p>
        <TextInput
          id={titleFieldId}
          label={t('deleteStory.typeTitle')}
          hint={t('deleteStory.typeTitleHint', { title: story.title })}
          errorMessage={missing.isShown ? t('deleteStory.titleMismatch') : undefined}
          value={typed}
          autoComplete="off"
          lang={story.languageCode}
          onChange={(event) => setTyped(event.target.value)}
        />
        {hasFailed && <Notice tone="error">{t('deleteStory.failed')}</Notice>}
        <ButtonRow>
          <Button
            variant="destructive"
            disabled={isDeleting}
            onClick={() => {
              // Step 1: the title must match first; otherwise say so beside the field.
              if (!missing.isReadyToSend()) return;
              // Step 2: hand the delete to the caller, which hides the story at once.
              onDelete();
            }}
          >
            {t('deleteStory.confirm')}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t('deleteStory.keep')}
          </Button>
        </ButtonRow>
      </div>
    </Sheet>
  );
}
