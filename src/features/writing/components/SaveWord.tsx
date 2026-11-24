/**
 * SaveWord: one short word beside the chapter's name in the editor's breadcrumb, "Saved" or
 * "Saving…", so the writer sees the save at a glance even when the Saving box is out of sight, on
 * a phone or below the fold (design books item 16, "Show what is inside").
 *
 * It is plain text, not a live region: the Saving box (SaveStatus) already says each change to a
 * screen reader, and two live regions would say it twice. Nothing shows before the first change.
 * Who uses it: ChapterEditorPage's EditorBreadcrumb. What it calls: nothing.
 */
import type { SaveState } from '../hooks/useAutosave';
import { useEditorTranslation } from '../registerEditorTranslations';

/** The word's key for each save state; null shows nothing (nothing typed yet). */
const wordKeys: Record<SaveState['kind'], string | null> = {
  idle: null,
  unsaved: 'saveWord.unsaved',
  saving: 'saveWord.saving',
  saved: 'saveWord.saved',
  offline: 'saveWord.onDevice',
  conflict: 'saveWord.notSaved',
  failed: 'saveWord.notSaved',
  notActive: 'saveWord.notSaved',
  invalid: 'saveWord.notSaved',
};

/**
 * Renders the word, or nothing while there is nothing to save.
 *
 * @param props.state - the autosave's state
 * @returns the word, or null
 */
export function SaveWord({ state }: { state: SaveState }) {
  const { t } = useEditorTranslation();
  const key = wordKeys[state.kind];
  if (key === null) return null;
  // A saved chapter reads in the muted ink; anything not saved in the warning colour, with words.
  const isProblem = key === 'saveWord.notSaved';
  return (
    <span
      data-save-word={state.kind}
      className={`type-meta ${isProblem ? 'text-(--warning-text)' : 'text-ink-muted'}`}
    >
      {t(key)}
    </span>
  );
}
