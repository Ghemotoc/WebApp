/**
 * NewThreadButtons: "Post the thread", "Preview" and "Cancel" under New thread, from the left
 * with the main button first (board F04; design books item 8), and the "Leave without posting?"
 * dialog Cancel opens when words are typed (bundle BOOKS-7, user story 7.4).
 *
 * Who uses it: NewThreadForm. What it calls: ButtonRow, Button and LeaveThreadDialog.
 */
import { useState } from 'react';

import { ButtonRow } from '@/components/ui/ButtonRow';
import { Button } from '@/components/ui/Button';

import { useForumsTranslation } from '../registerForumsTranslations';

import { LeaveThreadDialog } from './LeaveThreadDialog';
import { replyPreviewId } from './ReplyPreview';

/** What the buttons need. */
export interface NewThreadButtonsProps {
  isSending: boolean;
  isPreviewing: boolean;
  onTogglePreview: () => void;
  /** True when a title or a post is typed: Cancel then asks first (user story 7.4). */
  hasWords: boolean;
  /** Goes back to the forum or Together. */
  onLeave: () => void;
}

/**
 * Renders the row and the dialog.
 *
 * @returns the buttons
 */
export function NewThreadButtons(props: NewThreadButtonsProps) {
  const { isSending, isPreviewing, onTogglePreview, hasWords, onLeave } = props;
  const { t } = useForumsTranslation();
  const [isLeaving, setIsLeaving] = useState(false);

  /** Leaves at once with nothing typed; with words typed, asks first. */
  function cancel() {
    if (hasWords) setIsLeaving(true);
    else onLeave();
  }

  return (
    <>
      <ButtonRow>
        <Button type="submit" disabled={isSending}>
          {t('newThread.post')}
        </Button>
        <Button
          variant="secondary"
          aria-expanded={isPreviewing}
          aria-controls={isPreviewing ? replyPreviewId : undefined}
          onClick={onTogglePreview}
        >
          {isPreviewing ? t('reply.previewHide') : t('reply.preview')}
        </Button>
        {/* CALM-9b (board F04): Cancel is a text button after the other two. */}
        <Button variant="text" onClick={cancel}>
          {t('newThread.cancel')}
        </Button>
      </ButtonRow>
      <LeaveThreadDialog isOpen={isLeaving} onClose={() => setIsLeaving(false)} onLeave={onLeave} />
    </>
  );
}
