/**
 * useQuoteCardActions: Copy image and Save image on the quote card (story S1-E4-07).
 *
 * How: the first copy or save records the card (make_quote_card(), the limit of one per chapter,
 * Q17); after that the same card can be copied or saved again without counting twice. Each answer
 * becomes a short status line, read out by screen readers. "already_made" hands over to the limit
 * pop-up (second criterion).
 * Who calls it: QuoteCardDialog. What it calls: api/sharing.ts → make_quote_card(), and
 * lib/clipboard.ts.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { makeQuoteCard, QuoteCardRateLimitError, type ChapterAddress } from '../api/sharing';
import { copyPicture } from '../lib/clipboard';

import { quoteCardStateQueryKey } from './useQuoteCardState';

/**
 * The canvas as a PNG.
 *
 * @param canvas - the drawn card
 * @returns the picture
 * Errors: throws when the browser can't make the picture.
 */
function pictureOf(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) reject(new Error('The browser could not make the picture.'));
      else resolve(blob);
    }, 'image/png');
  });
}

/**
 * Hands the picture to the browser as a download.
 *
 * @param picture - the PNG
 * @param fileName - the name without ".png"
 */
function download(picture: Blob, fileName: string) {
  const address = URL.createObjectURL(picture);
  const link = document.createElement('a');
  link.href = address;
  link.download = `${fileName}.png`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(address), 1000);
}

/**
 * Follows the card's actions.
 *
 * @param address - the chapter
 * @param canvasRef - the drawn card
 * @param onLimit - called when the reader already made a card from this chapter
 * @returns copyImage(), saveImage(), status (a line to show, or '') and isWorking
 */
export function useQuoteCardActions(
  address: ChapterAddress,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  onLimit: () => void,
) {
  const { t } = useTranslation('sharing');
  const queryClient = useQueryClient();
  const [isMade, setIsMade] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [status, setStatus] = useState('');

  /** Records the card once; true when it may be copied or saved. */
  async function recordOnce(): Promise<boolean> {
    if (isMade) return true;
    const outcome = await makeQuoteCard(await requireClient(), address);
    if (outcome === 'already_made') onLimit();
    if (outcome === 'switched_off') setStatus(t('quote.switchedOff'));
    if (outcome === 'not_found') setStatus(t('quote.notFound'));
    if (outcome !== 'ok') return false;
    setIsMade(true);
    void queryClient.invalidateQueries({ queryKey: [quoteCardStateQueryKey] });
    return true;
  }

  /** Runs one action with the record first, and turns failures into a status line. */
  async function run(action: (picture: Blob) => Promise<string>) {
    const canvas = canvasRef.current;
    if (canvas === null || isWorking) return;
    setIsWorking(true);
    setStatus(t('quote.working'));
    try {
      if (await recordOnce()) setStatus(await action(await pictureOf(canvas)));
    } catch (error) {
      console.warn('The quote card failed.', error);
      setStatus(t(error instanceof QuoteCardRateLimitError ? 'quote.rateLimited' : 'quote.failed'));
    } finally {
      setIsWorking(false);
    }
  }

  const copyImage = () =>
    run(async (picture) =>
      t((await copyPicture(picture)) ? 'quote.copiedImage' : 'quote.copyImageFailed'),
    );
  const saveImage = () =>
    run(async (picture) => {
      download(picture, t('quote.fileName'));
      return t('quote.savedImage');
    });
  return { copyImage, saveImage, status, isWorking };
}
