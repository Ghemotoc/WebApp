/**
 * ShareDialog: "Share this chapter" on a computer (story S1-E4-05; board 3.6 Share).
 *
 * Board values: the eyebrow "Share", the heading, "<story> · Chapter n: <title>", the link in a
 * read-only field with "Copy link", the privacy line with its shield ("The link doesn't include
 * your name or any tracking code…"), "Other ways", the note on phones, "How the link looks in a
 * chat" and Done.
 * The Share button has already copied the link when this opens (S1-E4-05, first criterion), and
 * the line under the field says so; "Copy link" copies it again.
 * Differences from the board (docs/board-fixes.md): "Send in Messages" waits for private messages
 * (S1-E9-01); "Share a quote" is a hint, because a quote starts from text selected in the chapter;
 * the chat preview shows the chapter, since the reader has no blurb at hand.
 * Who uses it: LoadedSharingDialogs. What it calls: lib/clipboard.ts.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { brand } from '@/config/brand';

import type { SharedChapter } from '../lib/sharedChapter';
import { copyText } from '../lib/clipboard';
import { chapterShareLink } from '../lib/shareLink';

import { SharingModal } from './SharingModal';

/** What the dialog needs. */
export interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: SharedChapter;
  /** Whether the Share button's copy worked: true, false, or null when it didn't try. */
  wasCopied: boolean | null;
}

/** The small shield before the privacy line (a status icon, which the doodle rule exempts). */
function ShieldIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-0.5 flex-none text-(--success-text)"
    >
      <path d="M12 3 5 6v6c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6z" />
    </svg>
  );
}

/**
 * The link, its Copy button and what happened to the last copy.
 *
 * @returns the field row and the status line
 */
function LinkRow({ link, wasCopied }: { link: string; wasCopied: boolean | null }) {
  const { t } = useTranslation('sharing');
  const [copied, setCopied] = useState(wasCopied);
  let status = '';
  if (copied === true) status = t('dialog.copied');
  if (copied === false) status = t('dialog.copyFailed');
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="share-link" className="font-eyebrow text-sm text-eyebrow">
        {t('dialog.linkLabel')}
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          id="share-link"
          readOnly
          value={link}
          onFocus={(event) => event.target.select()}
          className="h-11 min-w-0 flex-1 basis-56 rounded-full border border-control-border bg-paper px-4 text-sm text-ink"
        />
        <Button onClick={() => void copyText(link).then(setCopied)}>{t('dialog.copy')}</Button>
      </div>
      <p role="status" className="m-0 min-h-5 text-sm text-body">
        {status}
      </p>
    </div>
  );
}

/**
 * How the link looks in a chat: the website, the story and writer, the chapter.
 *
 * @returns the preview card
 */
function ChatPreview({ chapter }: { chapter: SharedChapter }) {
  const { t } = useTranslation('sharing');
  return (
    <div className="flex flex-col gap-2">
      <h3 className="m-0 font-eyebrow text-sm font-normal text-eyebrow">
        {t('dialog.previewHeading')}
      </h3>
      <div className="flex flex-col gap-1 rounded-[14px] border border-border bg-paper p-4">
        <p className="m-0 text-xs text-meta">{brand.siteDomain}</p>
        <p className="m-0 text-[15px] font-semibold text-heading">
          {t('dialog.previewTitle', { story: chapter.storyTitle, writer: chapter.writerName })}
        </p>
        <p className="m-0 text-sm text-body">
          {t('dialog.previewChapter', {
            number: chapter.chapterNumber,
            chapter: chapter.chapterTitle,
          })}
        </p>
      </div>
      <p className="m-0 text-sm text-body">{t('dialog.friendNote')}</p>
    </div>
  );
}

/**
 * Renders the dialog.
 *
 * @returns the dialog
 */
export function ShareDialog({ isOpen, onClose, chapter, wasCopied }: ShareDialogProps) {
  const { t } = useTranslation('sharing');
  const link = chapterShareLink(chapter.address);
  return (
    <SharingModal
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={t('dialog.eyebrow')}
      title={t('dialog.title')}
      description={t('dialog.subtitle', {
        story: chapter.storyTitle,
        number: chapter.chapterNumber,
        chapter: chapter.chapterTitle,
      })}
      closeLabel={t('dialog.close')}
    >
      <LinkRow link={link} wasCopied={wasCopied} />
      <p className="m-0 flex gap-2 text-sm text-body">
        <ShieldIcon />
        <span>{t('dialog.privacy')}</span>
      </p>
      <div className="flex flex-col gap-2">
        <h3 className="m-0 font-eyebrow text-sm font-normal text-eyebrow">
          {t('dialog.otherWays')}
        </h3>
        <p className="m-0 text-sm text-body">{t('dialog.quoteHint')}</p>
        <p className="m-0 text-sm text-body">{t('dialog.deviceNote')}</p>
      </div>
      <ChatPreview chapter={chapter} />
      <div className="flex justify-end border-t border-border pt-4">
        <Button onClick={onClose}>{t('dialog.done')}</Button>
      </div>
    </SharingModal>
  );
}
