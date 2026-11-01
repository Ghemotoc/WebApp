/**
 * StoryShareButton: "Share" on the story page, for the whole story (bundle IDEAS-1, part c; idea
 * IDEA-20261031-11).
 *
 * It works like the chapter's ShareButton: on a phone or tablet whose browser has a share menu, it
 * opens the system share sheet; on a computer it copies the link and opens "Share this story".
 * The link is the story page's address with nothing added: no sharer ID, no tracking code. A
 * whole-story share isn't counted anywhere (the ranking counts chapter shares only).
 * Who uses it: StoryHeader. What it calls: lib/shareLink.ts, lib/clipboard.ts and
 * StoryShareDialog.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import { copyText } from '../lib/clipboard';
import { prefersSystemShare, shareWithSystem } from '../lib/systemShare';
import type { SharedStory } from '../lib/sharedStory';
import { storyShareLink } from '../lib/shareLink';
import { registerSharingTranslations } from '../registerSharingTranslations';

import { StoryShareDialog } from './StoryShareDialog';

/**
 * Renders the button and, on a computer, the dialog.
 *
 * @returns the button and the dialog once opened
 */
export function StoryShareButton({ story }: { story: SharedStory }) {
  const { t, i18n } = useTranslation('sharing');
  registerSharingTranslations(i18n);
  const [isOpen, setIsOpen] = useState(false);
  const [wasCopied, setWasCopied] = useState<boolean | null>(null);
  const link = storyShareLink(story.slug);

  /** Shares with the system sheet on a phone, or copies the link and opens the dialog. */
  async function share() {
    if (prefersSystemShare()) {
      try {
        await shareWithSystem(story.title, link);
        return;
      } catch (error) {
        // The sheet failed (not cancelled): fall back to copying, as on a computer.
        console.warn('The system share sheet failed.', error);
      }
    }
    setWasCopied(await copyText(link));
    setIsOpen(true);
  }

  return (
    <>
      <Button
        variant="secondary"
        aria-haspopup="dialog"
        aria-label={t('story.buttonLabel', { title: story.title })}
        onClick={() => void share()}
      >
        {t('button.button')}
      </Button>
      {wasCopied !== null && (
        <StoryShareDialog
          key={String(isOpen)}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          story={story}
          wasCopied={wasCopied}
        />
      )}
    </>
  );
}
