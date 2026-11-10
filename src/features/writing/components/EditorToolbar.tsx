/**
 * EditorToolbar: the formatting buttons above the chapter text (story S1-E3-02a; board 4.3).
 *
 * Board values: a white pill-shaped bar, 44 px round buttons, the pressed one tinted plum, a
 * thin divider, the word count at the far right. In board order: Bold, Italic, Heading, Quote,
 * List, Link, Scene break. Every button has an accessible name, a title with its shortcut,
 * aria-keyshortcuts, aria-pressed (for the toggles) and a focus ring; the bar is a
 * role="toolbar" with one tab stop and the arrow keys moving between buttons (WCAG 2.1.1).
 * After a thin divider come the insert controls (ChapterInsertControls, S1-E3-09 to 11; G9e):
 * the Picture and Video link buttons and the Insert menu, each with its own tab stop, then the
 * word count. Scene break draws the four-diamond mark the text shows (EditorToolbarIcons).
 * Who uses it: ChapterEditorPage.
 */
import type { Editor } from '@tiptap/react';
import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { ChapterInsertControls } from './ChapterInsertControls';
import {
  BoldIcon,
  HeadingIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  QuoteIcon,
  SceneBreakIcon,
} from './EditorToolbarIcons';

/** One button: its key in the locale file, its icon, what it does and whether it is "on". */
interface ToolbarAction {
  key: 'bold' | 'italic' | 'heading' | 'quote' | 'list' | 'link' | 'sceneBreak';
  /** The machine-readable shortcut (aria-keyshortcuts); the title shows the locale's text. */
  keyshortcuts: string;
  icon: ReactNode;
  run: (editor: Editor) => void;
  isOn?: (editor: Editor) => boolean;
}

/** What the toolbar needs. */
export interface EditorToolbarProps {
  editor: Editor;
  wordCount: number;
  onLink: () => void;
  /** The chapter's row ID, for the Insert menu's pictures (S1-E3-09). */
  chapterId: string;
}

/**
 * The actions, in board order.
 *
 * @param onLink - opens the link dialog
 * @returns the list
 */
function toolbarActions(onLink: () => void): ToolbarAction[] {
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
      key: 'sceneBreak',
      keyshortcuts: 'Control+Enter',
      icon: <SceneBreakIcon />,
      run: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },
  ];
}

/**
 * Renders the toolbar.
 *
 * @returns the bar with its buttons and the word count
 */
export function EditorToolbar({ editor, wordCount, onLink, chapterId }: EditorToolbarProps) {
  const { t } = useTranslation('editor');
  const actions = toolbarActions(onLink);
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
      className="flex flex-wrap items-center gap-0.5 rounded-full border border-border bg-surface p-1"
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
            className={`inline-flex size-11 items-center justify-center rounded-full ${
              isOn === true ? 'bg-tint text-link' : 'text-heading hover:bg-tint'
            }`}
          >
            {action.icon}
          </button>
        );
      })}
      <ChapterInsertControls editor={editor} chapterId={chapterId} />
      <span className="ml-auto px-4 text-sm text-meta">{t('wordCount', { count: wordCount })}</span>
    </div>
  );
}
