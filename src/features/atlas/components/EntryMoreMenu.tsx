/**
 * EntryMoreMenu: the round "…" button beside a story world entry's Edit, holding Delete entry (user
 * stories bundle 6, story 6.8, board E27: "More holds Delete entry (asks once, can't be undone)").
 *
 * A WAI-ARIA menu button, as on the chapter board's cards: Enter, Space or the down arrow opens it
 * on its item; Escape closes it and puts the focus back on the button; Tab or a click outside
 * closes it. Delete entry opens a small centred dialog that asks once ("Delete “Turda salt mine”?
 * This can't be undone.") with Yes, delete and Keep it, main button first on the left (ButtonRow).
 * A failed delete says so plainly in the dialog.
 * Who uses it: BibleEntryView. What it calls: the remove prop (useStoryBible's removeEntry), Sheet
 * and ButtonRow.
 */
import { useEffect, useId, useRef, useState, type RefObject } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { Notice } from '@/components/ui/Notice';
import { Sheet } from '@/components/ui/Sheet';

import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the menu needs. */
export interface EntryMoreMenuProps {
  /** The entry's title, for the button's name and the question. */
  title: string;
  /** Deletes the entry, then the caller closes it; throws when it can't. */
  remove: () => Promise<void>;
}

/** The menu's open state: closes on a click outside, and focuses its item when it opens. */
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

/** The dialog that asks once before deleting. */
function DeleteEntryDialog({
  isOpen,
  onClose,
  title,
  remove,
}: EntryMoreMenuProps & { isOpen: boolean; onClose: () => void }) {
  const { t } = useAtlasTranslation();
  const [hasFailed, setHasFailed] = useState(false);
  /** Deletes; the page then closes the entry, or the dialog says it failed. */
  async function confirm() {
    setHasFailed(false);
    await remove().catch(() => setHasFailed(true));
  }
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={t('bible.entry.delete.button')}
      placement="centre"
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 type-body text-ink">{t('bible.entry.delete.confirm', { title })}</p>
        <div aria-live="polite">
          {hasFailed && <Notice tone="error">{t('bible.entry.delete.failed')}</Notice>}
        </div>
        <ButtonRow>
          <Button variant="destructive" onClick={() => void confirm()}>
            {t('bible.entry.delete.yes')}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t('bible.entry.delete.keep')}
          </Button>
        </ButtonRow>
      </div>
    </Sheet>
  );
}

/** The open menu and its one item, Delete entry; Escape and Tab close it. */
function MoreMenuList({
  menuRef,
  menuId,
  title,
  onEscape,
  onTab,
  onDelete,
}: {
  menuRef: RefObject<HTMLDivElement | null>;
  menuId: string;
  title: string;
  onEscape: () => void;
  onTab: () => void;
  onDelete: () => void;
}) {
  const { t } = useAtlasTranslation();
  return (
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      tabIndex={-1}
      aria-label={t('bible.entry.more', { title })}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onEscape();
        else if (event.key === 'Tab') onTab();
      }}
      className="absolute top-full right-0 z-20 mt-1 flex w-52 flex-col gap-1 rounded-card border border-border bg-surface p-2 shadow-popover"
    >
      <button
        type="button"
        role="menuitem"
        tabIndex={-1}
        onClick={onDelete}
        className="flex min-h-11 w-full items-center rounded-field px-3 text-left type-body text-ink-heading hover:bg-tint"
      >
        {t('bible.entry.delete.button')}
      </button>
    </div>
  );
}

/**
 * Renders the "…" button, its menu and the delete dialog.
 *
 * @returns the button, the menu while open, and the dialog
 */
export function EntryMoreMenu({ title, remove }: EntryMoreMenuProps) {
  const { t } = useAtlasTranslation();
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { isOpen, setIsOpen, wrapperRef, menuRef } = useMenuState();
  const [isAsking, setIsAsking] = useState(false);
  /** Closes the menu and puts the focus back on its button. */
  const closeToButton = () => {
    setIsOpen(false);
    buttonRef.current?.focus();
  };
  return (
    <div ref={wrapperRef} className="relative flex-none">
      <button
        ref={buttonRef}
        type="button"
        aria-label={t('bible.entry.more', { title })}
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
        <MoreMenuList
          menuRef={menuRef}
          menuId={menuId}
          title={title}
          onEscape={closeToButton}
          onTab={() => setIsOpen(false)}
          onDelete={() => {
            setIsOpen(false);
            setIsAsking(true);
          }}
        />
      )}
      <DeleteEntryDialog
        isOpen={isAsking}
        onClose={() => setIsAsking(false)}
        title={title}
        remove={remove}
      />
    </div>
  );
}
