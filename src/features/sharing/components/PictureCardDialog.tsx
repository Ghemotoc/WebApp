/**
 * PictureCardDialog: "Your picture card" (story S1-E4-11, first criterion; board 3.6 Share).
 *
 * It shows the card (the picture, the story's title, "by <pen name>" and the link to the
 * picture's spot), the alt text we write and the reader may change, the link itself with Copy
 * link, and Copy image and Save image. The link carries no sharer ID (legal note). The card starts
 * in the writer's card colour when they picked one, and the reader can change it with the same
 * Background picker as the quote card (IDEAS-1c).
 * Who uses it: PictureShareButton. What it calls: PictureCardCanvas, usePictureBitmap and
 * usePictureCardActions.
 */
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { brand } from '@/config/brand';

import { usePictureBitmap } from '../hooks/usePictureBitmap';
import { usePictureCardActions } from '../hooks/usePictureCardActions';
import { useShareOptions } from '../hooks/useShareOptions';
import { paperBackground, type PictureCardContent } from '../lib/pictureCard';
import { backgroundByKey } from '../lib/quoteCard';
import type { SharedChapter } from '../lib/sharedChapter';
import { printedLink } from '../lib/shareLink';

import { BackgroundPicker } from './BackgroundPicker';
import { PictureCardCanvas } from './PictureCardCanvas';
import { SharingModal } from './SharingModal';

/** What the dialog needs. */
export interface PictureCardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: SharedChapter;
  /** The picture's alt text, from the chapter. */
  alt: string;
  /** Its signed address. */
  url: string;
  /** The full link to its spot in the chapter. */
  link: string;
}

/**
 * The status line and the three buttons.
 *
 * @returns the footer
 */
function PictureCardButtons(props: {
  actions: ReturnType<typeof usePictureCardActions>;
  isReady: boolean;
}) {
  const { t } = useTranslation('sharing');
  const { actions } = props;
  const isDisabled = actions.isWorking || !props.isReady;
  return (
    <>
      <p role="status" className="m-0 min-h-5 text-sm text-body">
        {actions.status}
      </p>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
        <Button variant="secondary" onClick={() => void actions.copyLink()}>
          {t('picture.copyLink')}
        </Button>
        <Button variant="secondary" disabled={isDisabled} onClick={() => void actions.copyImage()}>
          {t('picture.copyImage')}
        </Button>
        <Button disabled={isDisabled} onClick={() => void actions.saveImage()}>
          {t('picture.saveImage')}
        </Button>
      </div>
    </>
  );
}

/**
 * The picture's link, printed without "https://".
 *
 * @returns the line
 */
function PictureLinkLine({ link }: { link: string }) {
  const { t } = useTranslation('sharing');
  return (
    <p className="m-0 text-sm break-all text-body">
      <span className="font-semibold text-heading">{t('picture.linkLabel')}</span>{' '}
      {printedLink(link)}
    </p>
  );
}

/**
 * Renders the dialog.
 *
 * @returns the dialog
 */
export function PictureCardDialog({
  isOpen,
  onClose,
  chapter,
  alt,
  url,
  link,
}: PictureCardDialogProps) {
  const { t } = useTranslation('sharing');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const picture = usePictureBitmap(url);
  // Step 1: the alt text we write; the reader may change it.
  const [altText, setAltText] = useState(() =>
    t('picture.altText', { story: chapter.storyTitle, writer: chapter.writerName, alt }),
  );
  // Step 2: the card's colour: the writer's when they picked one (IDEAS-1c), otherwise paper.
  const { cardColour } = useShareOptions(chapter.address);
  const [background, setBackground] = useState(
    () => backgroundByKey(cardColour) ?? paperBackground,
  );
  // Step 3: the words on the card, kept stable so the canvas redraws only on a real change.
  const content = useMemo<PictureCardContent>(
    () => ({
      storyTitle: chapter.storyTitle,
      writerLine: t('quote.byline', { writer: chapter.writerName }),
      link: printedLink(link),
      productName: brand.productName,
      background,
    }),
    [chapter, link, background, t],
  );
  const actions = usePictureCardActions(chapter.address, link, canvasRef);
  return (
    <SharingModal
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={t('picture.eyebrow')}
      title={t('picture.title')}
      description={t('picture.description')}
      closeLabel={t('picture.close')}
    >
      <PictureCardCanvas
        content={content}
        picture={picture.bitmap}
        altText={altText}
        canvasRef={canvasRef}
      />
      {picture.failed && <p className="m-0 text-sm text-body">{t('picture.loadFailed')}</p>}
      <BackgroundPicker chosen={background} onChoose={setBackground} />
      <Textarea
        id="picture-alt-text"
        label={t('picture.altLabel')}
        hint={t('picture.altHint')}
        rows={3}
        value={altText}
        onChange={(event) => setAltText(event.target.value)}
      />
      <PictureLinkLine link={link} />
      <PictureCardButtons actions={actions} isReady={picture.bitmap !== null} />
    </SharingModal>
  );
}
