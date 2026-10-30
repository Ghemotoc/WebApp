/**
 * QuoteCardDialog: "Your quote card" (story S1-E4-07; board 3.6 Share).
 *
 * Board values: the eyebrow "Share a quote", the heading, "Made from the text you selected.
 * n of 280 characters.", the card, Background, "Alt text for the image" with "We wrote this for
 * you…", then "One quote card per chapter." with Copy image and Save image.
 * The card shows the passage, the story's title, "by <pen name> · <link>" and the product's name
 * (first criterion). The alt text is written for the reader and they may change it (fifth
 * criterion). The first copy or save records the card; a second card from the same chapter shows
 * the limit pop-up instead (second criterion).
 * Who uses it: LoadedQuoteDialog. What it calls: QuoteCardCanvas, BackgroundPicker and
 * useQuoteCardActions.
 */
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { brand } from '@/config/brand';

import { useQuoteCardActions } from '../hooks/useQuoteCardActions';
import { purpleBackground, type QuoteCardContent } from '../lib/quoteCard';
import type { SharedChapter } from '../lib/sharedChapter';
import { chapterShareLink, printedLink } from '../lib/shareLink';

import { BackgroundPicker } from './BackgroundPicker';
import { QuoteCardCanvas } from './QuoteCardCanvas';
import { SharingModal } from './SharingModal';

/** What the dialog needs. */
export interface QuoteCardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: SharedChapter;
  passage: string;
  /** Called when the reader already made a card from this chapter: show the limit instead. */
  onLimit: () => void;
}

/**
 * The status line, "One quote card per chapter." and the two buttons.
 *
 * @returns the footer
 */
function QuoteCardButtons({ actions }: { actions: ReturnType<typeof useQuoteCardActions> }) {
  const { t } = useTranslation('sharing');
  return (
    <>
      <p role="status" className="m-0 min-h-5 text-sm text-body">
        {actions.status}
      </p>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
        <p className="m-0 mr-auto text-sm text-body">{t('quote.limitShort')}</p>
        <Button
          variant="secondary"
          disabled={actions.isWorking}
          onClick={() => void actions.copyImage()}
        >
          {t('quote.copyImage')}
        </Button>
        <Button disabled={actions.isWorking} onClick={() => void actions.saveImage()}>
          {t('quote.saveImage')}
        </Button>
      </div>
    </>
  );
}

/**
 * Renders the dialog.
 *
 * @returns the dialog
 */
export function QuoteCardDialog({
  isOpen,
  onClose,
  chapter,
  passage,
  onLimit,
}: QuoteCardDialogProps) {
  const { t } = useTranslation('sharing');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [background, setBackground] = useState(purpleBackground);
  // Step 1: the alt text we write; the reader may change it.
  const [altText, setAltText] = useState(() =>
    t('quote.altText', { story: chapter.storyTitle, writer: chapter.writerName, passage }),
  );
  // Step 2: what goes on the card, kept stable so the canvas redraws only on a real change.
  const content = useMemo<QuoteCardContent>(() => {
    const link = printedLink(chapterShareLink(chapter.address));
    return {
      passage,
      storyTitle: chapter.storyTitle,
      byline: t('quote.byline', { writer: chapter.writerName, link }),
      productName: brand.productName,
      background,
    };
  }, [passage, chapter, background, t]);
  const actions = useQuoteCardActions(chapter.address, canvasRef, onLimit);
  return (
    <SharingModal
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={t('quote.eyebrow')}
      title={t('quote.title')}
      description={t('quote.made', { count: Array.from(passage).length })}
      closeLabel={t('quote.close')}
    >
      <QuoteCardCanvas content={content} altText={altText} canvasRef={canvasRef} />
      <BackgroundPicker chosen={background} onChoose={setBackground} />
      <Textarea
        id="quote-alt-text"
        label={t('quote.altLabel')}
        hint={t('quote.altHint')}
        rows={3}
        value={altText}
        onChange={(event) => setAltText(event.target.value)}
      />
      <QuoteCardButtons actions={actions} />
    </SharingModal>
  );
}
