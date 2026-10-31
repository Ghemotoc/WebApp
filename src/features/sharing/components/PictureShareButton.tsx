/**
 * PictureShareButton: "Share picture" under a chapter picture in the reader (story S1-E4-11,
 * first criterion; board 3.6 Share).
 *
 * It shows only while the writer lets pictures be shared and the story is All ages or 13+
 * (share_options()), and ChapterText draws it only for a picture readers can see (its check has
 * passed, legal note). Pressing it opens the picture card, with the link to the picture's spot in
 * the chapter: the block the picture sits in, read from ChapterText's data-block mark.
 * Who uses it: ChapterText, through the reader's pictureShare prop (fetched on its own, for the
 * reader's 40 KB script budget). What it calls: useShareOptions, SharedChapterContext and
 * PictureCardDialog.
 */
import { useContext, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import type { PictureShareProps } from '@/features/reading/components/ChapterText';

import { useShareOptions } from '../hooks/useShareOptions';
import { SharedChapterContext } from '../lib/sharedChapterContext';
import type { SharedChapter } from '../lib/sharedChapter';
import { chapterShareLink, passageShareLink } from '../lib/shareLink';
import { registerSharingTranslations } from '../registerSharingTranslations';

import { PictureCardDialog } from './PictureCardDialog';

/**
 * The link to the block an element sits in, or the chapter's own link when it can't be told.
 *
 * @param element - the button's wrapper
 * @param chapter - the chapter
 * @returns the full link
 */
function linkToSpot(element: HTMLElement | null, chapter: SharedChapter): string {
  const block = Number(element?.closest('[data-block]')?.getAttribute('data-block'));
  if (!Number.isInteger(block) || block < 1) return chapterShareLink(chapter.address);
  return passageShareLink(chapter.address, { first: block, last: block });
}

/**
 * The button and, once pressed, the card; nothing when pictures may not be shared.
 *
 * @param props.chapter - the chapter being read
 * @param props.picture - the picture's ID, alt text and address
 * @returns the button and dialog
 */
function PictureShareForChapter({
  chapter,
  picture,
}: {
  chapter: SharedChapter;
  picture: PictureShareProps;
}) {
  const { t } = useTranslation('sharing');
  const options = useShareOptions(chapter.address);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [link, setLink] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  if (!options.pictures) return null;
  return (
    <div ref={wrapperRef} className="mt-2 flex justify-end">
      <Button
        variant="secondary"
        aria-label={t('picture.buttonLabel', { alt: picture.alt })}
        onClick={() => {
          setLink(linkToSpot(wrapperRef.current, chapter));
          setIsOpen(true);
        }}
      >
        {t('picture.button')}
      </Button>
      {link !== null && (
        <PictureCardDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          chapter={chapter}
          alt={picture.alt}
          url={picture.url}
          link={link}
        />
      )}
    </div>
  );
}

/**
 * Renders the button for one picture, inside the reader only.
 *
 * @returns the button, or nothing outside the reader
 */
export function PictureShareButton(props: PictureShareProps) {
  const { i18n } = useTranslation('sharing');
  registerSharingTranslations(i18n);
  const chapter = useContext(SharedChapterContext);
  if (chapter === null) return null;
  return <PictureShareForChapter chapter={chapter} picture={props} />;
}
