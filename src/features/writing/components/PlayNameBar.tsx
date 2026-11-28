/**
 * PlayNameBar: the cast's names above the keyboard on a phone, while a speaker's name is typed
 * (LAYOUTS-2; board D14, phone: "cast names above the keyboard").
 *
 * One row of chips on the bar's frosted glass, each 36 px tall with a 44 px touch target: the
 * names that fit what is typed (all of the cast while nothing is typed yet), then "+ Add" in the
 * link colour when the typed name isn't in the cast. A tap puts the name in the speech and moves
 * on to the line; the text keeps the focus, so the keyboard stays up. The row scrolls sideways
 * when the cast is long (no scrollbar, as everywhere; it stays scrollable by swipe).
 * Below 1024 px only: from 1024 px the names drop down under the name (PlayNameSuggestions).
 * Who uses it: EditorToolbarDock. What it calls: pickSuggestion() and putNameInSpeech().
 */
import type { Editor } from '@tiptap/react';

import type { PlayCaret } from '../hooks/usePlayCaret';
import { putNameInSpeech } from '../lib/playCommands';
import { pickSuggestion } from '../lib/playMode';
import { useEditorTranslation } from '../registerEditorTranslations';

/** The most chips shown while nothing is typed yet. */
const MAXIMUM_CHIPS = 8;

/** What the row needs. */
export interface PlayNameBarProps {
  editor: Editor;
  caret: PlayCaret;
}

/** The names to offer: those fitting what is typed, or the start of the cast. */
function chipNames(editor: Editor, caret: PlayCaret): string[] {
  if (caret.speakerName.trim() !== '') {
    return caret.suggestions.items.filter((item) => item.kind === 'cast').map((item) => item.name);
  }
  return editor.storage.playMode.castNames.slice(0, MAXIMUM_CHIPS);
}

/** The classes every chip shares: 36 px tall, centred, inside a 44 px touch target. */
const chipClasses =
  'inline-flex h-9 shrink-0 items-center rounded-full px-3 font-body type-meta font-semibold whitespace-nowrap';

/**
 * Renders the row while the caret is in a speaker's name.
 *
 * @returns the chips, or nothing
 */
export function PlayNameBar({ editor, caret }: PlayNameBarProps) {
  const { t } = useEditorTranslation();
  if (caret.kind !== 'name') return null;
  const names = chipNames(editor, caret);
  const addSuggestion = caret.suggestions.items.find((item) => item.kind === 'add');
  if (names.length === 0 && addSuggestion === undefined) return null;
  return (
    <div
      role="group"
      aria-label={t('play.nameBar.label')}
      className="box-surface mb-2 flex gap-2 overflow-x-auto rounded-card p-2 shadow-popover lg:hidden"
    >
      {names.map((name) => (
        <button
          key={name}
          type="button"
          // The text keeps the focus, so the keyboard stays up.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => putNameInSpeech(editor, name)}
          className={`${chipClasses} bg-tint tracking-wide text-ink-heading uppercase`}
        >
          {name}
        </button>
      ))}
      {addSuggestion !== undefined && (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => pickSuggestion(editor, addSuggestion)}
          aria-label={t('play.suggestions.add', { name: addSuggestion.name })}
          className={`${chipClasses} text-link`}
        >
          + {t('play.nameBar.add')}
        </button>
      )}
    </div>
  );
}
