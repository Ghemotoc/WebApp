/**
 * SaveNote: the short line under a Story Atlas field that says how its save went (Story Atlas
 * non-functional requirement: "a failed save says so in plain words and keeps the text").
 *
 * Read out politely by screen readers (aria-live), so a writer who can't see it still hears
 * "Saved" or the plain message when a save fails. Nothing shows while there is nothing to say.
 * Who uses it: PlanTextField and PlanSelectField.
 */
import type { AutosaveStatus } from '../hooks/useAutosaveField';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the note needs. */
export interface SaveNoteProps {
  /** The id the field's aria-describedby points at. */
  id: string;
  status: AutosaveStatus;
  /** The message for a value the rules refuse (only fields with a rule pass one). */
  invalidMessage?: string;
}

/** The words for each status; idle says nothing. */
function noteFor(
  status: AutosaveStatus,
  invalidMessage: string | undefined,
  t: (key: string) => string,
): string {
  if (status === 'saving') return t('save.saving');
  if (status === 'saved') return t('save.saved');
  if (status === 'failed') return t('save.failed');
  if (status === 'invalid') return invalidMessage ?? '';
  return '';
}

/**
 * Renders the note.
 *
 * @returns a live line, empty while there is nothing to say
 */
export function SaveNote({ id, status, invalidMessage }: SaveNoteProps) {
  const { t } = useAtlasTranslation();
  const isProblem = status === 'failed' || status === 'invalid';
  return (
    <p
      id={id}
      aria-live="polite"
      className={
        isProblem ? 'm-0 min-h-5 text-sm text-destructive' : 'm-0 min-h-5 text-[13px] text-meta'
      }
    >
      {noteFor(status, invalidMessage, t)}
    </p>
  );
}
