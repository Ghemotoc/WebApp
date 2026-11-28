/**
 * EditorToolbar: the formatting bar above the chapter's paper (story S1-E3-02a; board D05, user
 * story 5.5).
 *
 * In board order: Bold, Italic, Heading, Quote, List, Link and Footnote ("fn", Ctrl+Alt+F, pressed
 * while a note is open; BOOKS-D05b, board D13), a thin divider, then Insert (a
 * round "+" that opens Picture, Video link and Scene break, ChapterInsertControls) and Undo. The
 * "Poem" button moved to the paper's Layout choice (LAYOUTS-1, LayoutChoice). Below 1024 px a last button opens the chapter's plan as a
 * sheet, and the bar floats just above the on-screen keyboard (EditorToolbarDock). The word count
 * moved to the editor's bar and the foot of the paper.
 * Every formatting button has an accessible name, a title with its shortcut, aria-keyshortcuts,
 * aria-pressed (for the toggles) and a focus ring; the formatting buttons are one tab stop with
 * the arrow keys moving between them (WCAG 2.1.1), and the controls after the divider each have
 * their own tab stop. Scene break keeps its shortcut (Ctrl+Enter) in the text.
 * In a play (LAYOUTS-2, board D14) the bar is "Formatting, play layout": Bold and Italic, then the
 * block buttons "Act or scene", "Character", "Line" and "Direction" (pressed for the block with
 * the caret), then fn and Undo; on phones Italic, "Scene", "Name", "Line", "Direction" and Undo.
 * Headings, quotes, lists, links and Insert are left out of a play's bar.
 * Who uses it: EditorToolbarDock. What it calls: ChapterInsertControls and setPlayBlockKind().
 */
import type { Editor } from '@tiptap/react';
import { useState, type KeyboardEvent, type ReactNode } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';

import { setPlayBlockKind, type PlayBlockKind } from '../lib/playCommands';

import { ChapterInsertControls } from './ChapterInsertControls';
import {
  BoldIcon,
  HeadingIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  QuoteIcon,
} from './EditorToolbarIcons';
import { useEditorTranslation } from '../registerEditorTranslations';

/** The formatting buttons' keys in the locale file. */
type FormattingKey = 'bold' | 'italic' | 'heading' | 'quote' | 'list' | 'link' | 'footnote';

/** The play's block buttons (LAYOUTS-2): an act or scene, a character's name, a line, a direction. */
type PlayButtonKey = 'act' | 'name' | 'line' | 'direction';

/** One button: its key in the locale file, its icon, what it does and whether it is "on". */
interface ToolbarAction {
  key: FormattingKey | PlayButtonKey;
  /** The machine-readable shortcut (aria-keyshortcuts); the title shows the locale's text. */
  keyshortcuts?: string;
  icon: ReactNode;
  run: (editor: Editor) => void;
  isOn?: (editor: Editor) => boolean;
  /** Extra classes: a button the phone's bar leaves out (board D14). */
  className?: string;
  /** A play's block button (a word, not an icon): which block it makes. */
  playKey?: PlayButtonKey;
}

/** What the toolbar needs. */
export interface EditorToolbarProps {
  editor: Editor;
  onLink: () => void;
  /** Puts a footnote at the cursor and opens its note (BOOKS-D05b). */
  onFootnote: () => void;
  /** True while a footnote's note is open: the fn button shows as pressed (board D13). */
  isFootnoteOpen: boolean;
  /** The chapter's row ID, for the Insert menu's pictures (S1-E3-09). */
  chapterId: string;
  /** Opens the chapter's plan as a sheet; the button shows below 1024 px only. */
  onOpenPlan: () => void;
  /** The kind of play block the caret is in, or null when the chapter isn't a play (LAYOUTS-2). */
  playKind: PlayBlockKind | null;
  /** True when the chapter's layout is Play: the bar shows the play's buttons. */
  isPlay: boolean;
}

/**
 * The "fn" the board draws for Footnote: two small bold letters, in the toolbar's colour. They are
 * drawn by the stylesheet (`.tmc-footnote-mark::before`), not written in the page, so the button's
 * one name is "Footnote" in each language: axe counts letters in the page as part of the name and
 * refuses "fn" beside "Notă de subsol" (WCAG 2.5.3, label in name).
 */
function FootnoteMark() {
  return <span aria-hidden="true" className="tmc-footnote-mark type-kicker font-semibold" />;
}

/** What the toolbar's own buttons open. */
interface ToolbarOpeners {
  onLink: () => void;
  onFootnote: () => void;
  isFootnoteOpen: boolean;
}

/** Bold (Ctrl+B), the first button of both bars. */
const boldAction: ToolbarAction = {
  key: 'bold',
  keyshortcuts: 'Control+B',
  icon: <BoldIcon />,
  run: (editor) => editor.chain().focus().toggleBold().run(),
  isOn: (editor) => editor.isActive('bold'),
};

/** Italic (Ctrl+I). */
const italicAction: ToolbarAction = {
  key: 'italic',
  keyshortcuts: 'Control+I',
  icon: <ItalicIcon />,
  run: (editor) => editor.chain().focus().toggleItalic().run(),
  isOn: (editor) => editor.isActive('italic'),
};

/** Footnote (Ctrl+Alt+F), pressed while a note is open (board D13). */
function footnoteAction({
  onFootnote,
  isFootnoteOpen,
}: Omit<ToolbarOpeners, 'onLink'>): ToolbarAction {
  return {
    key: 'footnote',
    keyshortcuts: 'Control+Alt+F',
    icon: <FootnoteMark />,
    run: () => onFootnote(),
    isOn: () => isFootnoteOpen,
  };
}

/**
 * The actions, in board order.
 *
 * @param openers - opens the link dialog and adds a footnote
 * @returns the list
 */
function toolbarActions({ onLink, onFootnote, isFootnoteOpen }: ToolbarOpeners): ToolbarAction[] {
  return [
    boldAction,
    italicAction,
    {
      key: 'heading',
      keyshortcuts: 'Control+Alt+2',
      icon: <HeadingIcon />,
      run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isOn: (editor) => editor.isActive('heading'),
    },
    {
      key: 'quote',
      keyshortcuts: 'Control+Shift+9',
      icon: <QuoteIcon />,
      run: (editor) => editor.chain().focus().toggleBlockquote().run(),
      isOn: (editor) => editor.isActive('blockquote'),
    },
    {
      key: 'list',
      keyshortcuts: 'Control+Shift+8',
      icon: <ListIcon />,
      run: (editor) => editor.chain().focus().toggleBulletList().run(),
      isOn: (editor) => editor.isActive('bulletList'),
    },
    {
      key: 'link',
      keyshortcuts: 'Control+K',
      icon: <LinkIcon />,
      run: () => onLink(),
      isOn: (editor) => editor.isActive('link'),
    },
    footnoteAction({ onFootnote, isFootnoteOpen }),
  ];
}

/** True when the caret's block is of one of these kinds (an act and a scene share one button). */
function isKind(kind: PlayBlockKind | null, wanted: PlayBlockKind[]): boolean {
  return kind !== null && wanted.includes(kind);
}

/**
 * A play's buttons (board D14): Bold and Italic, the four block buttons, then fn. The phone's bar
 * leaves out Bold and fn.
 *
 * @param openers - opens the footnote's note
 * @param playKind - the block the caret is in
 * @returns the list
 */
function playActions(openers: ToolbarOpeners, playKind: PlayBlockKind | null): ToolbarAction[] {
  const blockButton = (
    key: PlayButtonKey,
    run: (editor: Editor) => void,
    kinds: PlayBlockKind[],
  ): ToolbarAction => ({ key, playKey: key, icon: null, run, isOn: () => isKind(playKind, kinds) });
  return [
    { ...boldAction, className: 'max-lg:hidden' },
    italicAction,
    // "Act or scene": an act, pressed again a scene, then an act again.
    blockButton('act', (editor) => setPlayBlockKind(editor, playKind === 'act' ? 'scene' : 'act'), [
      'act',
      'scene',
    ]),
    blockButton('name', (editor) => setPlayBlockKind(editor, 'name'), ['name']),
    blockButton('line', (editor) => setPlayBlockKind(editor, 'line'), ['line']),
    blockButton('direction', (editor) => setPlayBlockKind(editor, 'direction'), ['direction']),
    { ...footnoteAction(openers), className: 'max-lg:hidden' },
  ];
}

/** A play's block button's words: the board's full name from 1024 px, the short one below. */
function PlayButtonWords({ actionKey }: { actionKey: PlayButtonKey }) {
  const { t } = useEditorTranslation();
  return (
    <>
      <span className="max-lg:hidden">{t(`play.blocks.${actionKey}`)}</span>
      <span className="lg:hidden">{t(`play.blocksShort.${actionKey}`)}</span>
    </>
  );
}

/** One round 40 px icon button after the divider (Undo, the plan), named by its label. */
function ToolButton(props: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      onClick={props.onClick}
      className={`inline-flex size-10 items-center justify-center rounded-full text-ink-heading hover:bg-tint ${props.className ?? ''}`}
    >
      {props.children}
    </button>
  );
}

/**
 * Renders the toolbar.
 *
 * @returns the bar with its buttons
 */
export function EditorToolbar(props: EditorToolbarProps) {
  const { editor, chapterId, onOpenPlan, isPlay } = props;
  const { t } = useEditorTranslation();
  const actions = isPlay ? playActions(props, props.playKind) : toolbarActions(props);
  // One tab stop: Tab lands on the remembered button, the arrow keys move along the bar.
  const [focusedIndex, setFocusedIndex] = useState(0);

  /** Left and right (or up and down) move between buttons; Home and End jump to the ends. */
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    let next: number | null = null;
    if (step !== undefined) next = (index + step + actions.length) % actions.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = actions.length - 1;
    if (next === null) return;
    event.preventDefault();
    setFocusedIndex(next);
    document.getElementById(`chapter-toolbar-${actions[next]?.key ?? ''}`)?.focus();
  }

  return (
    <div
      role="toolbar"
      aria-label={isPlay ? t('play.toolbarLabel') : t('toolbar.label')}
      // A play's phone bar is one line (board D14), scrolling sideways if the screen is narrow.
      className={`box-surface flex items-center gap-1 rounded-full p-1 ${isPlay ? 'flex-wrap max-lg:flex-nowrap max-lg:overflow-x-auto' : 'flex-wrap'}`}
    >
      {actions.map((action, index) => (
        <ToolbarActionButton
          key={action.key}
          action={action}
          editor={editor}
          isFocusTarget={index === focusedIndex}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onFocus={() => setFocusedIndex(index)}
        />
      ))}
      <span
        aria-hidden="true"
        className={`mx-2 h-6 w-px shrink-0 bg-border ${isPlay ? 'max-lg:hidden' : ''}`}
      />
      {/* Insert is for prose and poems: a play has no pictures or cards between its speeches. */}
      {!isPlay && <ChapterInsertControls editor={editor} chapterId={chapterId} />}
      <ToolButton label={t('toolbar.undo')} onClick={() => editor.chain().focus().undo().run()}>
        <ActionIcon name="undo" size={20} />
      </ToolButton>
      {/* The plan: beside the paper from 1024 px, a sheet below (board D05, tablets and phones). */}
      <ToolButton label={t('toolbar.plan')} onClick={onOpenPlan} className="lg:hidden">
        <ActionIcon name="list" size={20} />
      </ToolButton>
    </div>
  );
}

/**
 * One formatting or block button: an icon in a 40 px circle, or a play block's words in a 36 px
 * pill, pressed when it applies to the caret.
 *
 * @returns the button
 */
function ToolbarActionButton(props: {
  action: ToolbarAction;
  editor: Editor;
  isFocusTarget: boolean;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onFocus: () => void;
}) {
  const { t } = useEditorTranslation();
  const { action, editor } = props;
  const isOn = action.isOn?.(editor);
  const isWord = action.playKey !== undefined;
  const name = isWord ? undefined : t(`toolbar.${action.key}`);
  const shape = isWord
    ? 'h-9 shrink-0 px-3 font-body type-meta font-semibold whitespace-nowrap'
    : 'size-10 shrink-0';
  return (
    <button
      id={`chapter-toolbar-${action.key}`}
      type="button"
      // A word button is named by its words; an icon button by its label, with the shortcut.
      aria-label={name}
      title={
        name === undefined
          ? undefined
          : t('toolbar.withShortcut', { name, keys: t(`toolbar.keys.${action.key}`) })
      }
      aria-keyshortcuts={action.keyshortcuts}
      aria-pressed={action.isOn === undefined ? undefined : isOn}
      tabIndex={props.isFocusTarget ? 0 : -1}
      onClick={() => action.run(editor)}
      onKeyDown={props.onKeyDown}
      onFocus={props.onFocus}
      className={`inline-flex items-center justify-center rounded-full ${shape} ${
        isOn === true ? 'bg-tint text-link' : 'text-ink-heading hover:bg-tint'
      } ${action.className ?? ''}`}
    >
      {action.playKey === undefined ? action.icon : <PlayButtonWords actionKey={action.playKey} />}
    </button>
  );
}
