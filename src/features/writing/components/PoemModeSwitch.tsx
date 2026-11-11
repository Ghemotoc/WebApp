/**
 * PoemModeSwitch: "Poem mode" above the chapter text (bundle MUST-2; IDEA-20261106-1).
 *
 * A labelled checkbox with a hint saying what changes: Enter starts a new line, a second Enter a
 * new stanza, and spaces at the start of a line stay. A failed save says so in words.
 * Who shows it: ChapterEditorPage, under the toolbar. What it calls: nothing; usePoemMode saves.
 */
import { useId } from 'react';

import { Notice } from '@/components/ui/Notice';

import { useEditorTranslation } from '../registerEditorTranslations';

/** What the switch needs: usePoemMode's answer. */
export interface PoemModeSwitchProps {
  isPoem: boolean;
  isSaving: boolean;
  hasFailed: boolean;
  change: (next: boolean) => void;
}

/**
 * Renders the switch.
 *
 * @returns the checkbox, its hint and an error note when a save failed
 */
export function PoemModeSwitch({ isPoem, isSaving, hasFailed, change }: PoemModeSwitchProps) {
  const { t } = useEditorTranslation();
  const fieldId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-3">
        <input
          id={fieldId}
          type="checkbox"
          checked={isPoem}
          disabled={isSaving}
          aria-describedby={`${fieldId}-hint`}
          onChange={(event) => change(event.target.checked)}
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-(--link) disabled:cursor-default"
        />
        <label htmlFor={fieldId} className="text-[15px] font-medium text-heading">
          {t('poemMode.label')}
        </label>
      </div>
      <p id={`${fieldId}-hint`} className="m-0 text-[13px] text-meta">
        {t('poemMode.hint')}
      </p>
      {hasFailed && <Notice tone="error">{t('poemMode.failed')}</Notice>}
    </div>
  );
}
