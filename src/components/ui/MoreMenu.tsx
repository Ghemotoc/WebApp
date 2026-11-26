/**
 * MoreMenu: a round "…" button that opens a short menu of actions for one row (bundle 5, board
 * D03: "More for chapter 11" with Rename, Preview, Schedule or Unpublish, Copy link and Delete).
 *
 * A WAI-ARIA menu button, as BoardCardMenu on the chapter board: Enter, Space or the down arrow
 * opens the menu on its first item; the arrow keys, Home and End move between items; Escape
 * closes it and puts focus back on the button; Tab or a click outside closes it. An item is a
 * button (it runs its action) or a link (it opens its address). A danger item (Delete) is drawn in
 * the danger ink and keeps its word, so colour is never the only sign (DoD; user story 5.3).
 * An item can be for phones only (Earlier and Later on the Chapters page sit in More under 600
 * px); it is hidden from 600 px, and the arrow keys skip what is hidden.
 * Who uses it: ChapterRowActions. What it calls: the actions it is given.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { cn } from '@/lib/utils';

/** One entry in the menu: a button with its action, or a link with its address. */
export interface MoreMenuItem {
  key: string;
  label: string;
  /** What a press does; left out for a link. */
  onSelect?: () => void;
  /** Where a link goes; left out for a button. */
  to?: string;
  /** True for Delete: the danger ink, last in the list. */
  isDanger?: boolean;
  /** True for an item shown only under 600 px (it has a button of its own on wider screens). */
  onlyOnPhones?: boolean;
}

/** What the menu needs. */
export interface MoreMenuProps {
  /** The button's and the menu's name ("More for chapter 11"). */
  label: string;
  items: MoreMenuItem[];
  /** The "…" button's ref, when the caller puts focus back on it (after a rename). */
  triggerRef?: RefObject<HTMLButtonElement | null>;
}

/**
 * The menu's items a person can see: an item for phones only is hidden on wider screens.
 *
 * @param menu - the open menu
 * @returns the shown items, top to bottom
 */
function shownItems(menu: HTMLElement | null): HTMLElement[] {
  const items = [...(menu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
  return items.filter((item) => item.getClientRects().length > 0);
}

/** Moves focus between the menu's items with the arrow keys, Home and End. */
function moveFocus(event: KeyboardEvent<HTMLElement>, menu: HTMLElement | null) {
  const items = shownItems(menu);
  const current = items.indexOf(event.target as HTMLElement);
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

/**
 * The open state: closes on a click outside, and focuses the first item when it opens.
 *
 * @returns whether it is open, the setter and the refs for the wrapper and the menu
 */
function useMenuState() {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return undefined;
    // Step 1: focus the first item, so the arrow keys work at once.
    shownItems(menuRef.current)[0]?.focus();
    // Step 2: a press anywhere outside the menu and its button closes it.
    const closeOutside = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [isOpen]);
  return { isOpen, setIsOpen, wrapperRef, menuRef };
}

/** The classes every item shares; a danger item swaps the ink. */
function itemClassName(item: MoreMenuItem) {
  return cn(
    'flex min-h-11 w-full items-center rounded-field px-3 text-left type-body no-underline hover:bg-tint',
    item.isDanger === true ? 'text-destructive' : 'text-ink-heading',
    item.onlyOnPhones === true && 'sm:hidden',
  );
}

/** One item: a link that closes the menu, or a button that closes it and runs its action. */
function MenuEntry({ item, onDone }: { item: MoreMenuItem; onDone: () => void }) {
  if (item.to !== undefined) {
    return (
      <Link
        to={item.to}
        role="menuitem"
        tabIndex={-1}
        className={itemClassName(item)}
        onClick={onDone}
      >
        {item.label}
      </Link>
    );
  }
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      className={itemClassName(item)}
      onClick={() => {
        onDone();
        item.onSelect?.();
      }}
    >
      {item.label}
    </button>
  );
}

/**
 * Renders the "…" button and, while open, its menu.
 *
 * @param props.label - the name of the button and the menu
 * @param props.items - the actions, in the order shown
 * @param props.triggerRef - the "…" button's ref, when the caller needs it
 * @returns the button and its menu
 */
export function MoreMenu({ label, items, triggerRef }: MoreMenuProps) {
  const menuId = useId();
  const ownButtonRef = useRef<HTMLButtonElement>(null);
  const buttonRef = triggerRef ?? ownButtonRef;
  const { isOpen, setIsOpen, wrapperRef, menuRef } = useMenuState();
  // Closes the menu and puts focus back on its button (Escape, or after an action).
  const closeToButton = () => {
    setIsOpen(false);
    buttonRef.current?.focus();
  };
  return (
    <div ref={wrapperRef} className="relative flex-none">
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
        className="grid size-11 cursor-pointer place-items-center rounded-full text-ink-heading hover:bg-tint"
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
          className="absolute top-full right-0 z-20 mt-1 flex w-56 flex-col gap-1 rounded-card border border-border bg-surface p-2 shadow-popover"
        >
          {items.map((item) => (
            <MenuEntry key={item.key} item={item} onDone={closeToButton} />
          ))}
        </div>
      )}
    </div>
  );
}
