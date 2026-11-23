/**
 * BlockDialog: "Block @name?" with what a block does, Cancel and Block (story S1-E5-05; board
 * 6.1, the "Block inkwolf" action).
 *
 * Blocking is instant and the other person isn't told (board 6.1). The dialog says what changes
 * before anything happens, because a block also ends follows both ways. No doodles (DoD: safety
 * screens).
 * Who uses it: ProfileSafetyCard. What it calls: useBlock → set_block().
 */
import { usePeopleTranslation } from '../registerPeopleTranslations';

import { ButtonRow } from '@/components/ui/ButtonRow';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import { useBlock } from '../hooks/useBlock';

import { PeopleDialog } from './PeopleDialog';

/** What the dialog needs. */
export interface BlockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  handle: string;
}

/**
 * Renders the dialog.
 *
 * @returns the dialog
 */
export function BlockDialog({ isOpen, onClose, handle }: BlockDialogProps) {
  const { t } = usePeopleTranslation();
  const block = useBlock();

  /** Closing forgets a failed attempt, so the next opening starts clean. */
  function handleClose() {
    block.reset();
    onClose();
  }

  /** Blocks, then closes; a failure stays open with the message. */
  async function handleConfirm() {
    const isBlocked = await block.change(handle, true).catch(() => null);
    if (isBlocked === true) handleClose();
  }

  return (
    <PeopleDialog
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow={t('blockDialog.eyebrow')}
      title={t('blockDialog.title', { handle })}
      closeLabel={t('blockDialog.close')}
    >
      <p className="m-0 text-ink-muted">{t('blockDialog.body')}</p>
      {block.hasFailed && <Notice tone="error">{t('blockDialog.failed')}</Notice>}
      <ButtonRow>
        <Button
          variant="destructive"
          disabled={block.isSaving}
          onClick={() => void handleConfirm()}
        >
          {t(block.isSaving ? 'blockDialog.saving' : 'blockDialog.confirm')}
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          {t('blockDialog.cancel')}
        </Button>
      </ButtonRow>
    </PeopleDialog>
  );
}
