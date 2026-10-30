/**
 * QuoteLimitDialog: "One quote card per chapter" (story S1-E4-07, second criterion; Q17; board
 * 3.6 Share, other state 3).
 *
 * Shown as a pop-up when the reader presses "Share quote" in a chapter they already quoted, so a
 * chapter can't be shared bit by bit. It offers Close and "Copy the link instead", because the
 * link can always be shared. An alertdialog, so screen readers read the explanation at once.
 * Who uses it: LoadedQuoteDialog. What it calls: lib/clipboard.ts.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import { copyText } from '../lib/clipboard';
import type { SharedChapter } from '../lib/sharedChapter';
import { chapterShareLink } from '../lib/shareLink';

import { SharingModal } from './SharingModal';

/** What the pop-up needs. */
export interface QuoteLimitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: SharedChapter;
}

/**
 * Renders the pop-up.
 *
 * @returns the alert dialog
 */
export function QuoteLimitDialog({ isOpen, onClose, chapter }: QuoteLimitDialogProps) {
  const { t } = useTranslation('sharing');
  const [status, setStatus] = useState('');
  /** Copies the chapter's link and says whether it worked. */
  async function copyLink() {
    const copied = await copyText(chapterShareLink(chapter.address));
    setStatus(t(copied ? 'limit.copied' : 'dialog.copyFailed'));
  }
  return (
    <SharingModal
      isOpen={isOpen}
      onClose={onClose}
      role="alertdialog"
      title={t('limit.title')}
      description={t('limit.body')}
      closeLabel={t('limit.close')}
      width={460}
    >
      <p role="status" className="m-0 min-h-5 text-sm text-body">
        {status}
      </p>
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={() => void copyLink()}>
          {t('limit.copyLink')}
        </Button>
        <Button onClick={onClose}>{t('limit.close')}</Button>
      </div>
    </SharingModal>
  );
}
