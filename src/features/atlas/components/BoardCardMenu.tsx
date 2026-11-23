/**
 * BoardCardMenu: a chapter card's move menu on the chapter board (story S1-E17-19: "earlier,
 * later, previous act, next act … by keyboard or on a phone"; CALM-9, board E28: the four moves
 * sit behind one round "…" button on each card; WCAG 2.5.7, dragging has a single-pointer
 * alternative).
 *
 * A WAI-ARIA menu button: Enter, Space or the down arrow opens the menu on its first item; the
 * arrow keys, Home and End move between items; Escape closes it and puts focus back on the
 * button; Tab or a click outside closes it. A move that can't go anywhere (Earlier on the first
 * card) stays in the list, marked unavailable, so the list never changes shape.
 * Who uses it: BoardCard. What it calls: the move handlers it is given.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';

import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the menu needs: the card's title (for the button's name) and one handler per move. */
export interface BoardCardMenuProps {
  title: string;
  onEarlier: (() => void) | null;
  onLater: (() => void) | null;
  onPreviousAct: (() => void) | null;
  onNextAct: (() => void) | null;
}

/** Moves focus between the menu's items with the arrow keys, Home and End. */
function moveFocus(event: KeyboardEvent<HTMLElement>, menu: HTMLElement | null) {
  const items = [...(menu?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
  const current = items.indexOf(event.target as HTMLButtonElement);
  const lastIndex = items.length - 1;
  const nextIndexByKey: Record<string, number> = {
    ArrowDown: current === lastIndex ? 0 : current + 1,
    ArrowUp: current <= 0 ? lastIndex : current - 1,
    Home: 0,
    End: lastIndex,
  };
  const next = nextIndexByKey[event.key];
  if (next === undefined) return;
  event.preventDefault();
  items[next]?.focus();
}

/** The open state: closes on a click outside, and focuses the first item when it opens. */
function useMenuState() {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return undefined;
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [isOpen]);
  return { isOpen, setIsOpen, wrapperRef, menuRef };
}

/** One move in the menu; unavailable when its handler is null. */
function MoveItem({
  label,
  onMove,
  onDone,
}: {
  label: string;
  onMove: (() => void) | null;
  onDone: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      aria-disabled={onMove === null}
      onClick={() => {
        if (onMove === null) return;
        onDone();
        onMove();
      }}
      className="flex min-h-11 w-full items-center rounded-field px-3 text-left type-body text-ink-heading hover:bg-tint aria-disabled:cursor-not-allowed aria-disabled:text-ink-muted aria-disabled:hover:bg-transparent"
    >
      {label}
    </button>
  );
}

/** The four moves in the menu's order, each with its text key and its handler. */
function menuItems(moves: Omit<BoardCardMenuProps, 'title'>) {
  return [
    { key: 'earlier', onMove: moves.onEarlier },
    { key: 'later', onMove: moves.onLater },
    { key: 'previousAct', onMove: moves.onPreviousAct },
    { key: 'nextAct', onMove: moves.onNextAct },
  ];
}

/**
 * Renders the "…" button and, while open, its menu of moves.
 *
 * @returns the button and its menu
 */
export function BoardCardMenu({ title, ...moves }: BoardCardMenuProps) {
  const { t } = useAtlasTranslation();
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { isOpen, setIsOpen, wrapperRef, menuRef } = useMenuState();
  // Closes the menu and puts focus back on its button (Escape, or after a move).
  const closeToButton = () => {
    setIsOpen(false);
    buttonRef.current?.focus();
  };
  const items = menuItems(moves);
  return (
    <div ref={wrapperRef} className="relative flex-none">
      <button
        ref={buttonRef}
        type="button"
        aria-label={t('storyline.board.moves.group', { title })}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown') return;
          event.preventDefault();
          setIsOpen(true);
        }}
        className="grid size-11 cursor-pointer place-items-center rounded-full text-ink-muted hover:bg-tint hover:text-ink-heading"
      >
        <ActionIcon name="more" size={20} />
      </button>
      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          tabIndex={-1}
          aria-label={t('storyline.board.moves.group', { title })}
          onKeyDown={(event) => {
            if (event.key === 'Escape') closeToButton();
            else if (event.key === 'Tab') setIsOpen(false);
            else moveFocus(event, menuRef.current);
          }}
          className="absolute top-full right-0 z-20 mt-1 flex w-52 flex-col gap-1 rounded-card border border-border bg-surface p-2 shadow-popover"
        >
          {items.map((item) => (
            <MoveItem
              key={item.key}
              label={t(`storyline.board.moves.${item.key}`)}
              onMove={item.onMove}
              onDone={closeToButton}
            />
          ))}
        </div>
      )}
    </div>
  );
}
