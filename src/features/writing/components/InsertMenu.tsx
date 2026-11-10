/**
 * InsertMenu: the editor's "Insert" button and its menu (story S1-E3-09; board 4.3, the Insert
 * menu: picture, drawing, music, video).
 *
 * Board values: a 44 px pill button in plum text, filled plum while open; the menu is a white
 * card (24 px corners, a soft shadow) under it, at most 340 px wide and never wider than the
 * screen (it moves left when it would run past the right edge, useStayOnScreen), each item a
 * 56 px row with its line icon in a tinted tile, its name and a short note.
 * Keyboard (WAI-ARIA menu button): Enter, Space or the down arrow opens it on the first item; the
 * arrow keys, Home and End move; Escape closes it and puts focus back on the button; Tab or a
 * click outside closes it.
 * The items arrive from the caller, so each story adds its own (pictures in S1-E3-09, music and
 * video in S1-E3-10, drawings in S1-E3-11), and so does the footnote under them (a plain line
 * above a hairline, 13 px meta text).
 * Who uses it: ChapterInsertControls.
 */
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';

import { ActionIcon, type ActionIconName } from '@/components/icons/ActionIcon';
import { useEditorTranslation } from '../registerEditorTranslations';

/** One item of the menu. */
export interface InsertMenuItem {
  key: string;
  label: string;
  note: string;
  /** The item's line icon (ActionIcon, since NO-DOODLES); decorative. */
  icon: ActionIconName;
  onPick: () => void;
}

/**
 * Moves focus between the menu's items with the arrow keys, Home and End.
 *
 * @param event - the key press on an item
 * @param menu - the menu element
 */
function moveFocus(event: KeyboardEvent<HTMLElement>, menu: HTMLElement | null) {
  const items = [...(menu?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
  const current = items.indexOf(event.target as HTMLButtonElement);
  let next: number | null = null;
  if (event.key === 'ArrowDown') next = (current + 1) % items.length;
  if (event.key === 'ArrowUp') next = (current - 1 + items.length) % items.length;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = items.length - 1;
  if (next === null) return;
  event.preventDefault();
  items[next]?.focus();
}

/** The menu's open state, closing on a click outside and focusing the first item on open. */
function useMenuState() {
  const [isOpen, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    /** A press anywhere outside the button and the menu closes it. */
    function closeOnOutsidePress(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsidePress);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress);
  }, [isOpen]);
  return { isOpen, setOpen, wrapperRef, menuRef };
}

/** What the open menu needs. */
interface InsertMenuPanelProps {
  menuRef: RefObject<HTMLDivElement | null>;
  menuId: string;
  items: InsertMenuItem[];
  footnote: string | undefined;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onPicked: () => void;
}

/** The gap kept between the open menu and the window's right edge, in pixels. */
const WINDOW_MARGIN = 16;

/**
 * How far left the open menu moves so it never runs past the window's right edge. The menu
 * opens under its button, starting at the button's left edge; when the button sits near the
 * right of a narrow screen (the toolbar wraps on phones), the menu shifts left by what it
 * would overflow (WCAG 1.4.10, nothing scrolls sideways at 390 px).
 *
 * @returns the panel's ref and the shift in pixels (0 or less)
 */
function useStayOnScreen() {
  const panelRef = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);
  useLayoutEffect(() => {
    // Measure once, as the menu opens: its right edge against the window's.
    const panel = panelRef.current;
    if (panel === null) return;
    const overflow = panel.getBoundingClientRect().right - (window.innerWidth - WINDOW_MARGIN);
    if (overflow > 0) setShift(-overflow);
  }, []);
  return { panelRef, shift };
}

/** The open menu: one row per item, each with its line icon, name and note. */
function InsertMenuPanel(props: InsertMenuPanelProps) {
  const { menuRef, menuId, items, footnote, onKeyDown, onPicked } = props;
  const { t } = useEditorTranslation();
  const { panelRef, shift } = useStayOnScreen();
  // The footnote sits outside the menu role (a menu holds only items) and describes it.
  const footnoteId = `${menuId}-note`;
  return (
    <div
      ref={panelRef}
      style={{ left: shift }}
      className="absolute top-[54px] left-0 z-20 w-[min(340px,calc(100vw-32px))] rounded-[24px] border border-border bg-surface p-2 shadow-popover"
    >
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        tabIndex={-1}
        aria-label={t('insert.menuLabel')}
        aria-describedby={footnote === undefined ? undefined : footnoteId}
        onKeyDown={onKeyDown}
        className="flex flex-col gap-0.5"
      >
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              onPicked();
              item.onPick();
            }}
            className="flex min-h-14 w-full items-start gap-3 rounded-2xl px-3.5 py-2.5 text-left hover:bg-tint focus-visible:bg-tint"
          >
            <span
              aria-hidden="true"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-tint text-heading"
            >
              <ActionIcon name={item.icon} size={20} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold text-ink">{item.label}</span>
              <span className="text-[13px] leading-snug text-meta">{item.note}</span>
            </span>
          </button>
        ))}
      </div>
      {footnote !== undefined && (
        <p
          id={footnoteId}
          className="m-0 mt-1 border-t border-hairline px-3.5 pt-2.5 pb-1.5 text-[13px] leading-normal text-meta"
        >
          {footnote}
        </p>
      )}
    </div>
  );
}

/**
 * Renders the button and, while open, the menu.
 *
 * @param items - the menu's items
 * @param footnote - an optional line under them
 * @returns the menu button; nothing when there are no items
 */
export function InsertMenu({ items, footnote }: { items: InsertMenuItem[]; footnote?: string }) {
  const { t } = useEditorTranslation();
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { isOpen, setOpen, wrapperRef, menuRef } = useMenuState();
  if (items.length === 0) return null;

  /** Escape closes and returns focus; Tab closes; the other keys move between items. */
  function handleMenuKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (event.key === 'Tab') setOpen(false);
    moveFocus(event, menuRef.current);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setOpen(!isOpen)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`inline-flex h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold ${
          isOpen ? 'bg-primary text-on-primary' : 'text-heading hover:bg-tint'
        }`}
      >
        {t('insert.button')}
      </button>
      {isOpen && (
        <InsertMenuPanel
          menuRef={menuRef}
          menuId={menuId}
          items={items}
          footnote={footnote}
          onKeyDown={handleMenuKeyDown}
          onPicked={() => setOpen(false)}
        />
      )}
    </div>
  );
}
