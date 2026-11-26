/**
 * FootnoteMarker: a footnote's raised number in the chapter text, and its note when the reader
 * opens it (BOOKS-D05b; board B15-ReaderFootnotes, approved "as drawn").
 *
 * Board values: the number is a button named "Footnote 2" in the link colour, a 24 px target
 * (`.tmc-footnote-marker`, src/styles/index.css), with aria-expanded and aria-controls. From
 * 768 px it opens a small solid box under the number (the box surface, 16 px corners, the popover
 * shadow, at most 360 px wide): "Note 2" with a Close ×, then the note in the story font. Below
 * 768 px the note opens in the reader's bottom sheet (ReaderSheet) with its scrim, so it never
 * sits under the reader's thumb. Escape, Close or a press outside the box closes it, and focus
 * goes back to the number (WCAG 2.4.3). Every note is also listed under the text
 * (ChapterFootnoteList), where its Back link returns to this number.
 * Why two elements and not one styled twice: drawing both and hiding one would give screen
 * readers two copies of the note (useMinWidth).
 * Who uses it: ChapterText's link drawer. What it calls: ReaderSheet, CrossIcon and useMinWidth.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { useTranslation } from 'react-i18next';

import { CrossIcon } from '@/components/icons/CrossIcon';
import { useMinWidth } from '@/lib/useMinWidth';

import { footnoteReferenceId } from '../lib/numberFootnotes';

import { ReaderSheet } from './ReaderSheet';

/** From this width the note opens under its number; below it, in the sheet (board B15). */
const POPOVER_FROM_WIDTH = 768;

/** The smallest gap between the box and the window's edge, in pixels. */
const EDGE_GAP = 16;

/** What the marker needs. */
export interface FootnoteMarkerProps {
  /** The note's number in the chapter, from 1. */
  number: number;
  /** The ids' start for this chapter's text, so two texts on a page never share an id. */
  idPrefix: string;
  /** The note's words, as the text holds them. */
  children: ReactNode;
}

/**
 * Closes the box on Escape and on a press anywhere outside the number and the box.
 *
 * @param hostRef - the number with its box
 * @param onClose - closes it
 */
function useClosesOutside(hostRef: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    /** A press outside closes; one on the number or inside the box doesn't. */
    function handlePointer(event: PointerEvent) {
      if (event.target instanceof Node && hostRef.current?.contains(event.target)) return;
      onClose();
    }
    /** Escape closes, from anywhere on the page. */
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [hostRef, onClose]);
}

/**
 * Keeps the box inside the window: a number near the right edge moves its box left.
 *
 * @param boxRef - the box
 * @returns how far to move the box sideways, in pixels
 */
function useShiftIntoWindow(boxRef: RefObject<HTMLElement | null>): number {
  const [shift, setShift] = useState(0);
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (box === null) return;
    // Step 1: where the box falls before any shift.
    const rectangle = box.getBoundingClientRect();
    const overRight = rectangle.right - (window.innerWidth - EDGE_GAP);
    const overLeft = EDGE_GAP - rectangle.left;
    // Step 2: move it back inside, the right edge first (a box starts at its number's left).
    if (overRight > 0) setShift(-Math.min(overRight, Math.max(0, -overLeft)));
    else if (overLeft > 0) setShift(overLeft);
  }, [boxRef]);
  return shift;
}

/** The note's heading row: "Note 2" and the Close ×. */
function NoteHeading(props: { id: string; number: number; onClose: () => void }) {
  const { t } = useTranslation('reading');
  return (
    <span className="flex items-center justify-between gap-2">
      <span id={props.id} className="type-label font-semibold text-ink-heading">
        {t('footnote.heading', { number: props.number })}
      </span>
      <button
        type="button"
        aria-label={t('footnote.close')}
        onClick={props.onClose}
        className="inline-flex size-11 items-center justify-center rounded-full text-ink-heading hover:bg-tint"
      >
        <CrossIcon />
      </button>
    </span>
  );
}

/** The box under the number, from 768 px: a non-modal dialog the reader can leave at any time. */
function NotePopover(props: {
  id: string;
  number: number;
  onClose: () => void;
  children: ReactNode;
}) {
  const boxRef = useRef<HTMLSpanElement>(null);
  const shift = useShiftIntoWindow(boxRef);
  const headingId = `${props.id}-heading`;
  // The box takes focus as it opens, so a screen reader reads its name and the note.
  useEffect(() => boxRef.current?.focus(), []);
  return (
    <span
      ref={boxRef}
      id={props.id}
      role="dialog"
      aria-labelledby={headingId}
      tabIndex={-1}
      style={{ transform: `translateX(${shift}px)` }}
      className="tmc-footnote-popover box-surface flex flex-col gap-2 rounded-card p-4 text-left shadow-popover"
    >
      <NoteHeading id={headingId} number={props.number} onClose={props.onClose} />
      <span className="font-story type-body break-words text-ink">{props.children}</span>
    </span>
  );
}

/**
 * Renders the number, and its note while it is open.
 *
 * @returns the marker
 */
export function FootnoteMarker({ number, idPrefix, children }: FootnoteMarkerProps) {
  const { t } = useTranslation('reading');
  const [isOpen, setIsOpen] = useState(false);
  const isWide = useMinWidth(POPOVER_FROM_WIDTH);
  const hostRef = useRef<HTMLSpanElement>(null);
  const markerRef = useRef<HTMLButtonElement>(null);
  const noteId = `${idPrefix}-footnote-note-${number}`;
  /** Closes the note and puts focus back on the number (WCAG 2.4.3). */
  function close() {
    setIsOpen(false);
    markerRef.current?.focus({ preventScroll: true });
  }
  return (
    <span ref={hostRef} className="tmc-footnote-host">
      <button
        ref={markerRef}
        id={footnoteReferenceId(idPrefix, number)}
        type="button"
        className="tmc-footnote-marker"
        aria-label={t('footnote.label', { number })}
        aria-expanded={isOpen}
        aria-controls={isOpen ? noteId : undefined}
        onClick={() => setIsOpen((wasOpen) => !wasOpen)}
      >
        {number}
      </button>
      {isOpen && isWide && (
        <OpenPopover id={noteId} number={number} hostRef={hostRef} onClose={close}>
          {children}
        </OpenPopover>
      )}
      {isOpen && !isWide && (
        <ReaderSheet label={t('footnote.heading', { number })} onClose={close}>
          <span id={noteId} className="flex flex-col gap-2">
            <NoteHeading id={`${noteId}-heading`} number={number} onClose={close} />
            <span className="font-story type-body break-words text-ink">{children}</span>
          </span>
        </ReaderSheet>
      )}
    </span>
  );
}

/** The popover with its outside-press and Escape handling, only while it is open. */
function OpenPopover(props: {
  id: string;
  number: number;
  hostRef: RefObject<HTMLSpanElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  useClosesOutside(props.hostRef, props.onClose);
  return (
    <NotePopover id={props.id} number={props.number} onClose={props.onClose}>
      {props.children}
    </NotePopover>
  );
}
