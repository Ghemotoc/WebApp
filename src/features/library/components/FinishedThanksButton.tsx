/**
 * FinishedThanksButton: "Tell the writer you finished it" on the story page (bundle IDEAS-1,
 * part c; idea IDEA-20261031-3).
 *
 * It shows only for a story on the reader's Finished shelf (StoryReadingActions decides). Pressing
 * it sends the writer a fixed, kind notification with the reader's name: there is no text box,
 * so there is nothing to write and nothing to moderate. Once sent it reads "Sent" and can't be
 * pressed again (once per story). Nothing is sent across a block: the database refuses it.
 * Who uses it: StoryReadingActions. What it calls: useFinishedThanks → send_finished_thanks().
 */
import { CheckIcon } from '@/components/icons/CheckIcon';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { FinishedThanksOutcome } from '../api/library';
import { useFinishedThanks } from '../hooks/useFinishedThanks';
import { useLibraryTranslation } from '../registerLibraryTranslations';

/** What the button needs. */
export interface FinishedThanksButtonProps {
  storySlug: string;
  /** Whether the reader already thanked the writer for this story. */
  isSent: boolean;
}

/**
 * The line under the button after a press: sent, or why not.
 *
 * @returns the key of the words to show, or null for nothing
 */
function noteKeyFor(outcome: FinishedThanksOutcome | null, failed: boolean): string | null {
  if (failed) return 'thanks.failed';
  if (outcome === 'ok') return 'thanks.sentNote';
  if (outcome === 'not_active') return 'thanks.notActive';
  if (outcome === null || outcome === 'already_sent') return null;
  return 'thanks.failed';
}

/**
 * Renders the button, its hint and what happened.
 *
 * @returns the button block
 */
export function FinishedThanksButton({ storySlug, isSent }: FinishedThanksButtonProps) {
  const { t } = useLibraryTranslation();
  const thanks = useFinishedThanks(storySlug);
  const noteKey = noteKeyFor(thanks.outcome, thanks.failed);
  const isError = noteKey !== null && noteKey !== 'thanks.sentNote';
  return (
    <div className="flex max-w-[420px] flex-col gap-2">
      {isSent ? (
        <Button variant="secondary" disabled>
          <CheckIcon size={16} />
          {t('thanks.sent')}
        </Button>
      ) : (
        <Button
          variant="secondary"
          disabled={thanks.isSending}
          aria-describedby={`finished-thanks-hint-${storySlug}`}
          onClick={thanks.send}
        >
          {t('thanks.button')}
        </Button>
      )}
      {!isSent && (
        <p id={`finished-thanks-hint-${storySlug}`} className="m-0 text-sm text-body">
          {t('thanks.hint')}
        </p>
      )}
      {/* The notice is its own live region (status, or alert for an error). */}
      {noteKey !== null && <Notice tone={isError ? 'error' : 'success'}>{t(noteKey)}</Notice>}
    </div>
  );
}
