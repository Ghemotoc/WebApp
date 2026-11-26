/**
 * DeleteStoryControl: "Delete this story" in Story settings and the Story Atlas (story
 * S1-E3-05), as board D12 draws it (BOOKS D12, user story 5.12).
 *
 * The steps: (1) the line "The story and its chapters are hidden straight away…" with "Delete
 * story"; (2) the dialog "Delete <title>?" (DeleteStoryDialog), which asks for the title to be
 * typed; (3) once deleted, a status: "Story deleted. It's hidden from readers and will be gone
 * for good on <date>." with Undo.
 * Rules: asked twice (the button, then the typed title); hidden at once; 30 days of undo
 * (content_purge_days); then the nightly purge (S1-E3-05). Chapters follow the story
 * (S1-E3-02a extends the function).
 * Who uses it: StorySettingsPage and the Atlas's AtAGlance. What it calls: useStoryActions →
 * delete_my_story(), restore_my_story(); DeleteStoryDialog.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { MyStory } from '../api/stories';
import { useStoryActions } from '../hooks/useStoryActions';
import { purgeDateFor } from '../lib/purgeDate';

import { DeleteStoryDialog } from './DeleteStoryDialog';

/** Step 3: the story is deleted; Undo until the purge date. */
function DeletedNotice({ story }: { story: MyStory }) {
  const { t, i18n } = useTranslation('writing');
  const { restoreStory } = useStoryActions();
  const purgeDate = purgeDateFor(story.deletedAt ?? new Date().toISOString(), i18n.language);
  return (
    <div className="flex flex-col gap-3">
      <Notice tone="info">{t('deleteStory.deleted', { date: purgeDate })}</Notice>
      {restoreStory.isError && <Notice tone="error">{t('deleteStory.undoFailed')}</Notice>}
      <div>
        <Button
          variant="secondary"
          onClick={() => restoreStory.mutate(story.slug)}
          disabled={restoreStory.isPending}
        >
          {t('deleteStory.undo')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Renders the control for a story (deleted or not).
 *
 * @returns the card's contents
 */
export function DeleteStoryControl({ story }: { story: MyStory }) {
  const { t } = useTranslation('writing');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { deleteStory } = useStoryActions();

  // Step 3: once the story is deleted, the dialog has done its job and Undo shows instead.
  if (story.deletedAt !== null) return <DeletedNotice story={story} />;

  // Steps 1 and 2: the line and the button, which opens the dialog.
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 type-body text-ink-muted">{t('deleteStory.intro')}</p>
      <div>
        <Button variant="destructive" onClick={() => setIsDialogOpen(true)}>
          {t('deleteStory.button')}
        </Button>
      </div>
      <DeleteStoryDialog
        story={story}
        isOpen={isDialogOpen}
        isDeleting={deleteStory.isPending}
        hasFailed={deleteStory.isError}
        onClose={() => setIsDialogOpen(false)}
        onDelete={() => deleteStory.mutate(story.slug)}
      />
    </div>
  );
}
