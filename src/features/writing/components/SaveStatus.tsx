/**
 * SaveStatus: the sentence that tells a screen reader how the save went, and shows on screen
 * when the writer must act (story S1-E3-02a; board D05, user story 5.5).
 *
 * It is a role="status" region, so a screen reader hears "Saved at 14:02." without the writer
 * leaving the text (WCAG 4.1.3). Most states are only said: the save words in the editor's bar
 * and at the foot of the paper show them (SaveWord). Four need the writer, so they also show as
 * a tinted box above the paper: a conflict (the chapter changed on another device; the page adds
 * Keep this version and Compare versions under it), a refused save (the page adds Retry), a rule
 * the text breaks, and an account that can't save yet. The words follow the design books' item 13.
 * Who uses it: ChapterEditorPage.
 */
import type { TFunction } from 'i18next';

import { dateLocaleFor } from '@/lib/romania-time';
import { MAXIMUM_CHAPTER_CHARACTERS, MAXIMUM_CHAPTER_TITLE_LENGTH } from '@/schemas/chapter';

import type { SaveState } from '../hooks/useAutosave';
import { useEditorTranslation } from '../registerEditorTranslations';

/** The states the writer must act on: shown as a box, the rest only said. */
const shownKinds = new Set<SaveState['kind']>(['conflict', 'failed', 'invalid', 'notActive']);

/**
 * The line to show for a state.
 *
 * @param state - the autosave's state
 * @param t - the editor namespace's translator
 * @param language - the interface language, for the time
 * @returns the sentence
 */
function statusText(state: SaveState, t: TFunction<'editor'>, language: string): string {
  if (state.kind === 'saved') {
    // British English for the English interface (CTO, 24 Oct 2026): "14:05", not "02:05 PM".
    const time = new Intl.DateTimeFormat(dateLocaleFor(language), {
      hour: '2-digit',
      minute: '2-digit',
    }).format(state.at);
    return t('saving.savedAt', { time });
  }
  if (state.kind === 'invalid') {
    return t(state.messageKey, {
      max:
        state.messageKey === 'errors.titleTooLong'
          ? MAXIMUM_CHAPTER_TITLE_LENGTH
          : MAXIMUM_CHAPTER_CHARACTERS,
    });
  }
  return t(`saving.${state.kind}`);
}

/**
 * Renders the status line.
 *
 * @returns the role="status" paragraph: a box when the writer must act, hidden otherwise
 */
export function SaveStatus({ state }: { state: SaveState }) {
  const { t, i18n } = useEditorTranslation();
  // Nothing to say before the first change; the region stays so later changes are announced.
  const words = state.kind === 'idle' ? '' : statusText(state, t, i18n.language);
  const looks = shownKinds.has(state.kind)
    ? 'm-0 rounded-card bg-(--error-bg) px-4 py-3 type-body text-(--error-text)'
    : 'sr-only';
  return (
    <p role="status" data-testid="save-status" className={looks}>
      {words}
    </p>
  );
}
