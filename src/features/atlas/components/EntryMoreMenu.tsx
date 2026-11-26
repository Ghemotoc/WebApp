/**
 * EntryMoreMenu: the round "…" button beside a story world entry's Edit, holding Delete entry (user
 * stories bundle 6, story 6.8, board E27: "More holds Delete entry (asks once, can't be undone)").
 *
 * A WAI-ARIA menu button, as on the chapter board's cards: Enter, Space or the down arrow opens it
 * on its item; Escape closes it and puts the focus back on the button; Tab or a click outside
 * closes it. Delete entry opens a small centred dialog that asks once ("Delete “Turda salt mine”?
 * This can't be undone.") with Yes, delete and Keep it, main button first on the left (ButtonRow).
 * A failed delete says so plainly in the dialog.
 * Who uses it: BibleEntryView. What it calls: RowMoreMenu, the remove prop (useStoryBible's
 * removeEntry), Sheet and ButtonRow.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { Notice } from '@/components/ui/Notice';
import { Sheet } from '@/components/ui/Sheet';

import { useAtlasTranslation } from '../registerAtlasTranslations';

import { RowMoreMenu } from './RowMoreMenu';

/** What the menu needs. */
export interface EntryMoreMenuProps {
  /** The entry's title, for the button's name and the question. */
  title: string;
  /** Deletes the entry, then the caller closes it; throws when it can't. */
  remove: () => Promise<void>;
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

/**
 * Renders the "…" button, its menu and the delete dialog.
 *
 * @returns the button, the menu while open, and the dialog
 */
export function EntryMoreMenu({ title, remove }: EntryMoreMenuProps) {
  const { t } = useAtlasTranslation();
  const [isAsking, setIsAsking] = useState(false);
  // One item, Delete entry, which opens the dialog rather than deleting straight away.
  const items = [
    { key: 'delete', label: t('bible.entry.delete.button'), onSelect: () => setIsAsking(true) },
  ];
  return (
    <>
      <RowMoreMenu label={t('bible.entry.more', { title })} items={items} />
      <DeleteEntryDialog
        isOpen={isAsking}
        onClose={() => setIsAsking(false)}
        title={title}
        remove={remove}
      />
    </>
  );
}
