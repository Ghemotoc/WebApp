/**
 * RowMoreMenu: the round "…" button that holds a row's or a card's actions in Story Atlas (user
 * stories bundle 6: board E27's "More holds Delete entry", board E28's moves on each card and
 * board E29's "More on an event: Edit and Delete").
 *
 * A WAI-ARIA menu button: Enter, Space or the down arrow opens the menu on its first item; the
 * arrow keys, Home and End move between items; Escape closes it and puts the focus back on the
 * button; Tab or a click outside closes it. An action that can't run now (Earlier on the first
 * card) stays in the list, marked unavailable, so the list never changes shape. Choosing an item
 * closes the menu, puts the focus back on the button, then runs the item.
 * Who uses it: BoardCardMenu, EntryMoreMenu and TimelineEventItem. What it calls: the items'
 * handlers.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';

/** One action in the menu. */
export interface RowMoreMenuItem {
  /** A key unique in this menu. */
  key: string;
  /** The words on the item. */
  label: string;
  /** What it does, or null while it can't run (the item stays, marked unavailable). */
  onSelect: (() => void) | null;
}

/** What the menu needs. */
export interface RowMoreMenuProps {
  /** The button's and the menu's name, saying whose actions they are ("More for Mara is born"). */
  label: string;
  items: RowMoreMenuItem[];
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
    // Step 1: the focus goes to the first item, as the menu button pattern asks.
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    // Step 2: a press anywhere outside the button and its menu closes it.
    const closeOutside = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [isOpen]);
  return { isOpen, setIsOpen, wrapperRef, menuRef };
}

/** One item; unavailable when its handler is null. */
function MenuItem({ item, onDone }: { item: RowMoreMenuItem; onDone: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      aria-disabled={item.onSelect === null}
      onClick={() => {
        if (item.onSelect === null) return;
        onDone();
        item.onSelect();
      }}
      className="flex min-h-11 w-full items-center rounded-field px-3 text-left type-body text-ink-heading hover:bg-tint aria-disabled:cursor-not-allowed aria-disabled:text-ink-muted aria-disabled:hover:bg-transparent"
    >
      {item.label}
    </button>
  );
}

/**
 * Renders the "…" button and, while open, its menu.
 *
 * @returns the button and its menu
 */
export function RowMoreMenu({ label, items }: RowMoreMenuProps) {
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { isOpen, setIsOpen, wrapperRef, menuRef } = useMenuState();
  // Closes the menu and puts the focus back on its button (Escape, or after a choice).
  const closeToButton = () => {
    setIsOpen(false);
    buttonRef.current?.focus();
  };
  return (
    <div ref={wrapperRef} className="relative flex-none">
      {/* The "…" has no words, so its name says whose actions it holds (WCAG 4.1.2); 44 px is
          over the 24 px smallest target (WCAG 2.5.8). */}
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
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
          aria-label={label}
          onKeyDown={(event) => {
            if (event.key === 'Escape') closeToButton();
            else if (event.key === 'Tab') setIsOpen(false);
            else moveFocus(event, menuRef.current);
          }}
          className="absolute top-full right-0 z-20 mt-1 flex w-52 flex-col gap-1 rounded-card border border-border bg-surface p-2 shadow-popover"
        >
          {items.map((item) => (
            <MenuItem key={item.key} item={item} onDone={closeToButton} />
          ))}
        </div>
      )}
    </div>
  );
}
