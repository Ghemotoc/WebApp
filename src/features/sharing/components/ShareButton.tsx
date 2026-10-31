/**
 * ShareButton: "Share" at the end of a chapter (story S1-E4-05; boards 3.5 Reader and 3.6 Share).
 *
 * What it does (first criterion): on a phone or tablet whose browser has a share menu, it opens
 * the system share sheet; on a computer it copies the link and opens "Share this chapter", which
 * says it was copied. The link is the chapter's public address with nothing added (second
 * criterion, lib/shareLink.ts). Each share adds one to the chapter's share total for the ranking,
 * never who shared (third criterion; record_chapter_share()).
 * Cancelling the system sheet is not a share and isn't counted.
 * Who uses it: ChapterEnd. What it calls: lib/shareLink.ts, lib/clipboard.ts, then (fetched
 * after the share, for the reader's 40 KB script budget) lib/countShare.ts →
 * record_chapter_share() and, on a computer, LoadedShareDialog.
 */
import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import type { ChapterAddress } from '../api/sharing';
import { copyText } from '../lib/clipboard';
import type { SharedChapter } from '../lib/sharedChapter';
import { chapterShareLink } from '../lib/shareLink';
import { registerSharingTranslations } from '../registerSharingTranslations';

/** The dialog with its texts, fetched the first time it opens. */
const LoadedShareDialog = lazy(async () => {
  const module = await import('./LoadedShareDialog');
  return { default: module.LoadedShareDialog };
});

/**
 * Whether to use the system share sheet: a touch screen whose browser offers one.
 *
 * @returns true on phones and tablets with navigator.share
 */
function prefersSystemShare(): boolean {
  return typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

/**
 * Counts a share: fetches the counting code after the share, so it stays out of the reader's
 * script budget (lib/countShare.ts).
 *
 * @param address - the chapter
 * @param method - how it was shared, for the analytics event
 */
function countShare(address: ChapterAddress, method: 'copy_link' | 'share_sheet') {
  void import('../lib/countShare').then((module) => module.countShare(address, method));
}

/**
 * Opens the system share sheet.
 *
 * @returns true when the reader shared, false when they cancelled; throws when the sheet failed
 */
async function shareWithSystem(title: string, link: string): Promise<boolean> {
  try {
    await navigator.share({ title, url: link });
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return false;
    throw error;
  }
}

/**
 * Renders the button and, on a computer, the dialog.
 *
 * @returns the button and the dialog once opened
 */
export function ShareButton({ chapter }: { chapter: SharedChapter }) {
  const { t, i18n } = useTranslation('sharing');
  registerSharingTranslations(i18n);
  const [isOpen, setIsOpen] = useState(false);
  const [wasCopied, setWasCopied] = useState<boolean | null>(null);
  const link = chapterShareLink(chapter.address);

  /** Shares with the system sheet on a phone, or copies the link and opens the dialog. */
  async function share() {
    if (prefersSystemShare()) {
      try {
        if (await shareWithSystem(chapter.storyTitle, link))
          countShare(chapter.address, 'share_sheet');
        return;
      } catch (error) {
        // The sheet failed (not cancelled): fall back to copying, as on a computer.
        console.warn('The system share sheet failed.', error);
      }
    }
    const copied = await copyText(link);
    if (copied) countShare(chapter.address, 'copy_link');
    setWasCopied(copied);
    setIsOpen(true);
  }

  return (
    <>
      <Button
        variant="secondary"
        aria-haspopup="dialog"
        aria-label={t('button.buttonLabel', { number: chapter.chapterNumber })}
        onClick={() => void share()}
      >
        {t('button.button')}
      </Button>
      {wasCopied !== null && (
        <Suspense fallback={null}>
          <LoadedShareDialog
            key={String(isOpen)}
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            chapter={chapter}
            wasCopied={wasCopied}
          />
        </Suspense>
      )}
    </>
  );
}
