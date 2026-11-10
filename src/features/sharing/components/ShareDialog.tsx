/**
 * ShareDialog: "Share this chapter" on a computer (story S1-E4-05; board 3.6 Share).
 *
 * Board values: the eyebrow "Share", the heading, "<story> · Chapter n: <title>", the link in a
 * read-only field with "Copy link", the privacy line with its shield ("The link doesn't include
 * your name or any tracking code…"), "Other ways", the note on phones, "How the link looks in a
 * chat" and Done.
 * The Share button has already copied the link when this opens (S1-E4-05, first criterion), and
 * the line under the field says so; "Copy link" copies it again.
 * "Send in Messages" (bundle GAPS-7, part a) takes a signed-in reader to Messages with the link
 * ready for the chat they pick; a visitor doesn't see it.
 * Differences from the board (docs/board-fixes.md): "Share a quote" is a hint, because a quote starts from text selected in the chapter;
 * the chat preview shows the chapter, since the reader has no blurb at hand.
 * Who uses it: LoadedShareDialog. What it calls: ShareLinkRow (the link and Copy link),
 * SharePrivacyNote and SendInMessagesLink, shared with the whole-story dialog.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { brand } from '@/config/brand';

import type { SharedChapter } from '../lib/sharedChapter';
import { chapterShareLink } from '../lib/shareLink';

import { SendInMessagesLink } from './SendInMessagesLink';
import { ShareLinkRow } from './ShareLinkRow';
import { SharePrivacyNote } from './SharePrivacyNote';
import { SharingModal } from './SharingModal';

/** What the dialog needs. */
export interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: SharedChapter;
  /** Whether the Share button's copy worked: true, false, or null when it didn't try. */
  wasCopied: boolean | null;
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
      <h3 className="m-0 eyebrow">{t('dialog.previewHeading')}</h3>
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
      <ShareLinkRow link={link} wasCopied={wasCopied} />
      <SharePrivacyNote text={t('dialog.privacy')} />
      <div className="flex flex-col gap-2">
        <h3 className="m-0 eyebrow">{t('dialog.otherWays')}</h3>
        <SendInMessagesLink link={link} countedChapter={chapter.address} />
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
