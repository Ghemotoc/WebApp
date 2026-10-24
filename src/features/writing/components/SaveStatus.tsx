/**
 * SaveStatus: the "Saving" box in the editor's aside (story S1-E3-02a; board 4.3, "What the
 * status can say").
 *
 * Board values: a tinted box with an icon and one line; sage for saved, plum for saving,
 * gold for unsaved, offline or failed, red for the conflict. It is a role="status" region, so a screen
 * reader hears "Saved" without the writer leaving the text (WCAG 4.1.3).
 * Who uses it: EditorAside.
 */
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { CheckIcon } from '@/components/icons/CheckIcon';
import { dateLocaleFor } from '@/lib/romania-time';
import { MAXIMUM_CHAPTER_CHARACTERS, MAXIMUM_CHAPTER_TITLE_LENGTH } from '@/schemas/chapter';

import type { SaveState } from '../hooks/useAutosave';

/** The box's tone per state, written out so Tailwind finds the classes. */
const toneClasses: Record<SaveState['kind'], string> = {
  idle: 'bg-panel text-body',
  unsaved: 'bg-(--warning-bg) text-(--warning-text)',
  saving: 'bg-tint text-(--info-text)',
  saved: 'bg-(--success-bg) text-(--success-text)',
  conflict: 'bg-(--error-bg) text-(--error-text)',
  offline: 'bg-(--warning-bg) text-(--warning-text)',
  failed: 'bg-(--warning-bg) text-(--warning-text)',
  notActive: 'bg-(--warning-bg) text-(--warning-text)',
  invalid: 'bg-(--error-bg) text-(--error-text)',
};

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
 * @returns the role="status" paragraph
 */
export function SaveStatus({ state }: { state: SaveState }) {
  const { t, i18n } = useTranslation('editor');
  return (
    <p
      role="status"
      className={`m-0 flex items-start gap-2 rounded-card px-3.5 py-3 text-sm leading-normal ${toneClasses[state.kind]}`}
    >
      {state.kind === 'saved' && (
        <span className="mt-0.5 flex-none" aria-hidden="true">
          <CheckIcon size={16} />
        </span>
      )}
      <span>{statusText(state, t, i18n.language)}</span>
    </p>
  );
}
