/**
 * PoemModeSwitch: the "Poem" button at the end of the editor's toolbar (bundle MUST-2; board D05,
 * user story 5.5: "the Poem switch (keeps line breaks, numbers stanzas)").
 *
 * A text button that stays pressed while the chapter is a poem (aria-pressed), so a screen
 * reader says "Poem, toggle button, pressed". What poem mode does is its description
 * (aria-describedby, a hidden line) and its tooltip, because the board shows only the word. While
 * the change saves the button is busy; a failed change shows its notice above the paper
 * (ChapterEditorPage).
 * Who uses it: EditorToolbar (the state comes from usePoemMode, through ChapterEditorPage).
 */
import { useId } from 'react';

import { buttonClassName } from '@/components/ui/buttonStyles';

import { useEditorTranslation } from '../registerEditorTranslations';

/** What the switch needs: usePoemMode's answer. */
export interface PoemModeSwitchProps {
  isPoem: boolean;
  isSaving: boolean;
  hasFailed: boolean;
  change: (next: boolean) => void;
}

/**
 * Renders the toggle.
 *
 * @returns the "Poem" text button with its hidden description
 */
export function PoemModeSwitch({ isPoem, isSaving, change }: PoemModeSwitchProps) {
  const { t } = useEditorTranslation();
  const hintId = useId();
  return (
    <>
      <button
        type="button"
        aria-pressed={isPoem}
        aria-busy={isSaving}
        aria-describedby={hintId}
        title={t('poemMode.hint')}
        onClick={() => {
          // A second press while the first change saves would only race it.
          if (!isSaving) change(!isPoem);
        }}
        className={buttonClassName(
          { variant: 'text' },
          // Pressed, the word reads in the link colour with the thicker underline.
          `mx-2 h-9 ${isPoem ? 'text-link decoration-2' : ''}`,
        )}
      >
        {t('poemMode.button')}
      </button>
      <span id={hintId} hidden>
        {t('poemMode.hint')}
      </span>
    </>
  );
}
