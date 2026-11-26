/**
 * SaveWord: the few words that say whether the chapter is saved, in the editor's bar ("Chapter
 * 16 · Saved · 240 words") and at the foot of the paper ("Saved at 14:02"), so the writer sees
 * the save at a glance (design books item 16, "Show what is inside"; board D05, user story 5.5).
 *
 * The words, as user story 5.5 lists them: "Saving…" (half a second after typing stops),
 * "Saved" or, with the time, "Saved at 14:02", and "Not saved yet. Trying again" in the danger
 * colour after a failed save (the text stays on the device and the save is tried every 10
 * seconds). A conflict or a refused save says "Not saved", also in the danger colour.
 * It is plain text, not a live region: SaveStatus, a hidden live region on the page, already
 * says each change to a screen reader, and two live regions would say it twice. Nothing shows
 * before the first change.
 * Who uses it: EditorBar and EditorPaper. What it calls: dateLocaleFor (the time's format).
 */
import { dateLocaleFor } from '@/lib/romania-time';

import type { SaveState } from '../hooks/useAutosave';
import { useEditorTranslation } from '../registerEditorTranslations';

/** The words' key for each save state; null shows nothing (nothing typed yet). */
const wordKeys: Record<SaveState['kind'], string | null> = {
  idle: null,
  unsaved: 'saveWord.unsaved',
  saving: 'saveWord.saving',
  saved: 'saveWord.saved',
  offline: 'saveWord.onDevice',
  conflict: 'saveWord.notSaved',
  failed: 'saveWord.retrying',
  notActive: 'saveWord.notSaved',
  invalid: 'saveWord.notSaved',
};

/** The keys that mean the words are not on the server: shown in the danger colour. */
const problemKeys = new Set(['saveWord.notSaved', 'saveWord.retrying']);

/** What the words need. */
export interface SaveWordProps {
  state: SaveState;
  /** True at the foot of the paper: a finished save says its time ("Saved at 14:02"). */
  withTime?: boolean;
}

/**
 * Renders the words, or nothing while there is nothing to save.
 *
 * @returns the words, or null
 */
export function SaveWord({ state, withTime = false }: SaveWordProps) {
  const { t, i18n } = useEditorTranslation();
  const key = wordKeys[state.kind];
  if (key === null) return null;
  // Step 1: the words; a finished save names its time where there is room for it.
  let words = t(key);
  if (state.kind === 'saved' && withTime) {
    // British English for the English interface (CTO, 24 Oct 2026): "14:05", not "02:05 PM".
    const time = new Intl.DateTimeFormat(dateLocaleFor(i18n.language), {
      hour: '2-digit',
      minute: '2-digit',
    }).format(state.at);
    words = t('saveWord.savedAt', { time });
  }
  // Step 2: a saved chapter reads in the muted ink; anything not saved in the danger colour.
  const colour = problemKeys.has(key) ? 'text-(--error-text)' : 'text-ink-muted';
  return (
    <span data-save-word={state.kind} className={`type-meta ${colour}`}>
      {words}
    </span>
  );
}
