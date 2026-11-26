/**
 * EditorToolbar: the formatting bar above the chapter's paper (story S1-E3-02a; board D05, user
 * story 5.5).
 *
 * In board order: Bold, Italic, Heading, Quote, List, Link and Footnote ("fn", Ctrl+Alt+F, pressed
 * while a note is open; BOOKS-D05b, board D13), a thin divider, then Insert (a
 * round "+" that opens Picture, Video link and Scene break, ChapterInsertControls), Undo and the
 * "Poem" text button (PoemModeSwitch). Below 1024 px a last button opens the chapter's plan as a
 * sheet, and the bar floats just above the on-screen keyboard (EditorToolbarDock). The word count
 * moved to the editor's bar and the foot of the paper.
 * Every formatting button has an accessible name, a title with its shortcut, aria-keyshortcuts,
 * aria-pressed (for the toggles) and a focus ring; the formatting buttons are one tab stop with
 * the arrow keys moving between them (WCAG 2.1.1), and the controls after the divider each have
 * their own tab stop. Scene break keeps its shortcut (Ctrl+Enter) in the text.
 * Who uses it: EditorToolbarDock. What it calls: ChapterInsertControls and PoemModeSwitch.
 */
import type { Editor } from '@tiptap/react';
import { useState, type KeyboardEvent, type ReactNode } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';

import { ChapterInsertControls } from './ChapterInsertControls';
import {
  BoldIcon,
  HeadingIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  QuoteIcon,
} from './EditorToolbarIcons';
import { PoemModeSwitch, type PoemModeSwitchProps } from './PoemModeSwitch';
import { useEditorTranslation } from '../registerEditorTranslations';

/** One button: its key in the locale file, its icon, what it does and whether it is "on". */
interface ToolbarAction {
  key: 'bold' | 'italic' | 'heading' | 'quote' | 'list' | 'link' | 'footnote';
  /** The machine-readable shortcut (aria-keyshortcuts); the title shows the locale's text. */
  keyshortcuts: string;
  icon: ReactNode;
  run: (editor: Editor) => void;
  isOn?: (editor: Editor) => boolean;
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
  /** Poem mode's state and change (usePoemMode). */
  poem: PoemModeSwitchProps;
  /** Opens the chapter's plan as a sheet; the button shows below 1024 px only. */
  onOpenPlan: () => void;
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

/**
 * The actions, in board order.
 *
 * @param openers - opens the link dialog and adds a footnote
 * @returns the list
 */
function toolbarActions({ onLink, onFootnote, isFootnoteOpen }: ToolbarOpeners): ToolbarAction[] {
  return [
    {
      key: 'bold',
      keyshortcuts: 'Control+B',
      icon: <BoldIcon />,
      run: (editor) => editor.chain().focus().toggleBold().run(),
      isOn: (editor) => editor.isActive('bold'),
    },
    {
      key: 'italic',
      keyshortcuts: 'Control+I',
      icon: <ItalicIcon />,
      run: (editor) => editor.chain().focus().toggleItalic().run(),
      isOn: (editor) => editor.isActive('italic'),
    },
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
    {
      key: 'footnote',
      keyshortcuts: 'Control+Alt+F',
      icon: <FootnoteMark />,
      run: () => onFootnote(),
      isOn: () => isFootnoteOpen,
    },
  ];
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
  const { editor, chapterId, poem, onOpenPlan } = props;
  const { t } = useEditorTranslation();
  const actions = toolbarActions(props);
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
      aria-label={t('toolbar.label')}
      className="box-surface flex flex-wrap items-center gap-1 rounded-full p-1"
    >
      {actions.map((action, index) => {
        const name = t(`toolbar.${action.key}`);
        const isOn = action.isOn?.(editor);
        return (
          <button
            key={action.key}
            id={`chapter-toolbar-${action.key}`}
            type="button"
            aria-label={name}
            title={t('toolbar.withShortcut', { name, keys: t(`toolbar.keys.${action.key}`) })}
            aria-keyshortcuts={action.keyshortcuts}
            aria-pressed={action.isOn === undefined ? undefined : isOn}
            tabIndex={index === focusedIndex ? 0 : -1}
            onClick={() => action.run(editor)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onFocus={() => setFocusedIndex(index)}
            className={`inline-flex size-10 items-center justify-center rounded-full ${
              isOn === true ? 'bg-tint text-link' : 'text-ink-heading hover:bg-tint'
            }`}
          >
            {action.icon}
          </button>
        );
      })}
      <span aria-hidden="true" className="mx-2 h-6 w-px bg-border" />
      <ChapterInsertControls editor={editor} chapterId={chapterId} />
      <ToolButton label={t('toolbar.undo')} onClick={() => editor.chain().focus().undo().run()}>
        <ActionIcon name="undo" size={20} />
      </ToolButton>
      <PoemModeSwitch {...poem} />
      {/* The plan: beside the paper from 1024 px, a sheet below (board D05, tablets and phones). */}
      <ToolButton label={t('toolbar.plan')} onClick={onOpenPlan} className="lg:hidden">
        <ActionIcon name="list" size={20} />
      </ToolButton>
    </div>
  );
}
