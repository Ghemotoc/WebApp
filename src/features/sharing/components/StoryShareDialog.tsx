/**
 * StoryShareDialog: "Share this story" on a computer (bundle IDEAS-1, part c; idea
 * IDEA-20261031-11), the whole-story twin of the chapter's ShareDialog (board 3.6 Share).
 *
 * The Share button has already copied the link when this opens; "Copy link" copies it again. The
 * link is the story page's own address with nothing added (no sharer, no tracking). "How the link
 * looks in a chat" copies what the link preview really sends (lib/sharedStory.ts): the cover
 * colour, the title, "by <pen name>" and the blurb; for a 16+ or 18+ story only the title and the
 * rating, as for chapters.
 * Who uses it: StoryShareButton. What it calls: ShareLinkRow, SharePrivacyNote and SharingModal.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { brand } from '@/config/brand';

import {
  ratingLabels,
  showsTitleOnly,
  storyPreviewColour,
  type SharedStory,
} from '../lib/sharedStory';
import { storyShareLink } from '../lib/shareLink';

import { ShareLinkRow } from './ShareLinkRow';
import { SharePrivacyNote } from './SharePrivacyNote';
import { SharingModal } from './SharingModal';

/** What the dialog needs. */
export interface StoryShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  story: SharedStory;
  /** Whether the Share button's copy worked: true, false, or null when it didn't try. */
  wasCopied: boolean | null;
}

/**
 * The preview's words: the title with the pen name and the blurb, or the title and the rating.
 *
 * @returns the lines under the site's name
 */
function PreviewWords({ story }: { story: SharedStory }) {
  const { t } = useTranslation('sharing');
  if (showsTitleOnly(story.rating)) {
    return (
      <>
        <p className="m-0 text-[15px] font-semibold text-heading">{story.title}</p>
        <p className="m-0 text-sm text-body">{ratingLabels[story.rating]}</p>
      </>
    );
  }
  return (
    <>
      <p className="m-0 text-[15px] font-semibold text-heading">
        {t('dialog.previewTitle', { story: story.title, writer: story.writerName })}
      </p>
      {story.blurb !== '' && <p className="m-0 text-sm text-body">{story.blurb}</p>}
    </>
  );
}

/**
 * How the link looks in a chat: the cover colour, the website and the words.
 *
 * @returns the preview card and the note under it
 */
function StoryChatPreview({ story }: { story: SharedStory }) {
  const { t } = useTranslation('sharing');
  return (
    <div className="flex flex-col gap-2">
      <h3 className="m-0 font-eyebrow text-sm font-normal text-eyebrow">
        {t('dialog.previewHeading')}
      </h3>
      <div className="flex gap-3 rounded-[14px] border border-border bg-paper p-4">
        {/* The preview's picture: a plain square in the cover colour, decorative only. */}
        <span
          aria-hidden="true"
          data-testid="story-preview-colour"
          className="size-14 flex-none rounded-lg border border-[rgba(38,20,46,0.14)]"
          style={{ backgroundColor: storyPreviewColour(story) }}
        />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="m-0 text-xs text-meta">{brand.siteDomain}</p>
          <PreviewWords story={story} />
        </div>
      </div>
      <p className="m-0 text-sm text-body">
        {showsTitleOnly(story.rating)
          ? t('story.titleOnlyNote', { rating: ratingLabels[story.rating] })
          : t('story.friendNote')}
      </p>
    </div>
  );
}

/**
 * Renders the dialog.
 *
 * @returns the dialog
 */
export function StoryShareDialog({ isOpen, onClose, story, wasCopied }: StoryShareDialogProps) {
  const { t } = useTranslation('sharing');
  return (
    <SharingModal
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={t('dialog.eyebrow')}
      title={t('story.title')}
      description={story.title}
      closeLabel={t('dialog.close')}
    >
      <ShareLinkRow link={storyShareLink(story.slug)} wasCopied={wasCopied} />
      <SharePrivacyNote text={t('story.privacy')} />
      <p className="m-0 text-sm text-body">{t('dialog.deviceNote')}</p>
      <StoryChatPreview story={story} />
      <div className="flex justify-end border-t border-border pt-4">
        <Button onClick={onClose}>{t('dialog.done')}</Button>
      </div>
    </SharingModal>
  );
}
