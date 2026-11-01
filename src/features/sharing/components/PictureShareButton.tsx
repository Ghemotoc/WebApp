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
import type { SpotRange } from '@/lib/chapter-blocks';

import { chapterShareLink, passageShareLink } from '../lib/shareLink';
import { registerSharingTranslations } from '../registerSharingTranslations';

import { PictureCardDialog } from './PictureCardDialog';

/** Where a picture card points: its link, and the block it sits in when that can be told. */
interface PictureSpot {
  link: string;
  range: SpotRange | null;
}

/**
 * The link to the block an element sits in, or the chapter's own link when it can't be told.
 * The block also goes to the share count, for the writer's most-loved lines (IDEAS-1d).
 *
 * @param element - the button's wrapper
 * @param chapter - the chapter
 * @returns the full link and the block
 */
function spotOf(element: HTMLElement | null, chapter: SharedChapter): PictureSpot {
  const block = Number(element?.closest('[data-block]')?.getAttribute('data-block'));
  if (!Number.isInteger(block) || block < 1) {
    return { link: chapterShareLink(chapter.address), range: null };
  }
  const range = { first: block, last: block };
  return { link: passageShareLink(chapter.address, range), range };
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
  const [spot, setSpot] = useState<PictureSpot | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  if (!options.pictures) return null;
  return (
    <div ref={wrapperRef} className="mt-2 flex justify-end">
      <Button
        variant="secondary"
        aria-label={t('picture.buttonLabel', { alt: picture.alt })}
        onClick={() => {
          setSpot(spotOf(wrapperRef.current, chapter));
          setIsOpen(true);
        }}
      >
        {t('picture.button')}
      </Button>
      {spot !== null && (
        <PictureCardDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          chapter={chapter}
          alt={picture.alt}
          url={picture.url}
          link={spot.link}
          range={spot.range}
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
