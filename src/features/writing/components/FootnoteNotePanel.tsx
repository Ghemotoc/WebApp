/**
 * FootnoteNotePanel: the box where the writer types a footnote's note (BOOKS-D05b; board
 * D13-EditorFootnotes, approved "as drawn").
 *
 * Board values: a small solid box (the box surface, 16 px corners, the popover shadow), 360 px
 * wide, under its number from 1024 px; below 1024 px it sits just above the floating formatting
 * bar, full width less 8 px a side (board D13, label 2: "the note opens above the bar"), so the
 * on-screen keyboard never hides it. Inside: "Footnote 2" with a Close ×, the note in a field in
 * the story font (its label "Footnote 2 text" for screen readers only), the count "45 of 600",
 * then Done and Remove (docs/board-fixes.md, D13: the buttons sit on the left, Done first).
 * Behaviour: it opens with the focus in the field; Escape, Close, Done or a click outside closes it
 * (a note left empty is taken out, useFootnoteEditing); each change is saved into the text at once.
 * It is a non-modal dialog: the writer can click back into the chapter at any time.
 * Who uses it: EditorPaper. What it calls: useFootnoteEditing's actions, useKeyboardInset and
 * Button.
 */
import type { Editor } from '@tiptap/react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react';

import { Button } from '@/components/ui/Button';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { CrossIcon } from '@/components/icons/CrossIcon';
import { MAXIMUM_FOOTNOTE_LENGTH } from '@/lib/chapter-footnotes';
import { normaliseTypedText } from '@/lib/romanian-text';

import type { FootnoteEditing, OpenFootnote } from '../hooks/useFootnoteEditing';
import { useIsWideEditor } from '../hooks/useIsWideEditor';
import { useKeyboardInset } from '../hooks/useKeyboardInset';
import { useEditorTranslation } from '../registerEditorTranslations';

/** The box's width beside the text (board D13). */
const PANEL_WIDTH = 360;

/** What the panel needs. */
export interface FootnoteNotePanelProps {
  editor: Editor;
  footnotes: FootnoteEditing;
  /** The paper's text area, which the box is placed in from 1024 px. */
  containerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Where the box sits from 1024 px: 12 px under its number, its left edge 24 px before the
 * number's, kept inside the text area.
 *
 * @returns the box's top and left in the text area, or null below 1024 px
 */
function useBoxPlace(
  editor: Editor,
  openNote: OpenFootnote,
  containerRef: RefObject<HTMLDivElement | null>,
): { top: number; left: number } | null {
  const isWide = useIsWideEditor();
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    /** Step 1: measure the number and the text area; step 2: keep the box inside the area. */
    function measure() {
      const marker = editor.view.nodeDOM(openNote.position);
      const container = containerRef.current;
      if (!(marker instanceof HTMLElement) || container === null) return;
      const markerBox = marker.getBoundingClientRect();
      const containerBox = container.getBoundingClientRect();
      const widest = Math.max(0, containerBox.width - PANEL_WIDTH);
      const left = Math.min(Math.max(0, markerBox.left - containerBox.left - 24), widest);
      setPlace({ top: markerBox.bottom - containerBox.top + 12, left });
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [editor, openNote.position, openNote.note, containerRef]);
  return isWide ? place : null;
}

/**
 * Closes the box on Escape and on a press anywhere outside it.
 *
 * @param panelRef - the box
 * @param onClose - closes it
 */
function useClosesOutside(panelRef: RefObject<HTMLDivElement | null>, onClose: () => void) {
  // The latest close, kept in a ref so the listener stays the same one while the box is open.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    /** A press outside the box closes it; one inside (the field, the buttons) doesn't. */
    function handlePointer(event: PointerEvent) {
      if (event.target instanceof Node && panelRef.current?.contains(event.target)) return;
      closeRef.current();
    }
    /** Escape closes it, wherever the focus is inside the editor. */
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closeRef.current();
    }
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [panelRef]);
}

/** The heading row: "Footnote 2" and the Close ×. */
function PanelHeading(props: { id: string; number: number; onClose: () => void }) {
  const { t } = useEditorTranslation();
  return (
    <div className="flex items-center justify-between gap-2">
      {/* A <p>, not a heading: the box sits inside the chapter text, whose headings are the
          writer's own (the dialog is named by it through aria-labelledby). */}
      <p id={props.id} className="m-0 type-label font-semibold text-ink-heading">
        {t('footnote.label', { number: props.number })}
      </p>
      <button
        type="button"
        aria-label={t('footnote.close')}
        onClick={props.onClose}
        className="inline-flex size-11 items-center justify-center rounded-full text-ink-heading hover:bg-tint"
      >
        <CrossIcon />
      </button>
    </div>
  );
}

/** The note's field and its count. */
function NoteField(props: { number: number; note: string; onChange: (note: string) => void }) {
  const { t } = useEditorTranslation();
  const fieldId = useId();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  // The field takes the focus as the box opens, and again when another note opens in it.
  useEffect(() => fieldRef.current?.focus(), [props.number]);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="sr-only">
        {t('footnote.textLabel', { number: props.number })}
      </label>
      <textarea
        ref={fieldRef}
        id={fieldId}
        value={props.note}
        maxLength={MAXIMUM_FOOTNOTE_LENGTH}
        aria-describedby={`${fieldId}-count`}
        onChange={(event) => {
          normaliseTypedText(event.target);
          props.onChange(event.target.value);
        }}
        className="field-box min-h-24 w-full resize-y px-4 py-3 font-story type-body"
      />
      <p id={`${fieldId}-count`} className="m-0 type-meta text-ink-muted">
        {t('footnote.count', { count: props.note.length, max: MAXIMUM_FOOTNOTE_LENGTH })}
      </p>
    </div>
  );
}

/**
 * Renders the box for the open note, or nothing while no note is open.
 *
 * @returns the note box
 */
export function FootnoteNotePanel({ editor, footnotes, containerRef }: FootnoteNotePanelProps) {
  if (footnotes.openNote === null) return null;
  return (
    <OpenNoteBox
      editor={editor}
      footnotes={footnotes}
      openNote={footnotes.openNote}
      containerRef={containerRef}
    />
  );
}

/** The box itself, for one open note. */
function OpenNoteBox(props: FootnoteNotePanelProps & { openNote: OpenFootnote }) {
  const { t } = useEditorTranslation();
  const { footnotes, openNote } = props;
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const place = useBoxPlace(props.editor, openNote, props.containerRef);
  const keyboardInset = useKeyboardInset();
  useClosesOutside(panelRef, footnotes.close);
  // From 1024 px under its number; below that just above the floating formatting bar (72 px).
  const placeStyle =
    place === null
      ? { bottom: `calc(72px + ${keyboardInset}px + env(safe-area-inset-bottom))` }
      : { top: place.top, left: place.left, width: PANEL_WIDTH };
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby={headingId}
      style={placeStyle}
      className={`box-surface z-40 flex flex-col gap-2 rounded-card p-4 shadow-popover ${
        place === null ? 'fixed inset-x-2' : 'absolute'
      }`}
    >
      <PanelHeading id={headingId} number={openNote.number} onClose={footnotes.close} />
      <NoteField number={openNote.number} note={openNote.note} onChange={footnotes.changeNote} />
      <ButtonRow>
        <Button onClick={footnotes.close}>{t('footnote.done')}</Button>
        <Button variant="text" className="text-destructive" onClick={footnotes.remove}>
          {t('footnote.remove')}
        </Button>
      </ButtonRow>
    </div>
  );
}
