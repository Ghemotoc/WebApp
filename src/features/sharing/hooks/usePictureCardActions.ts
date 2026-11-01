/**
 * usePictureCardActions: Copy link, Copy image and Save image on the picture card (story S1-E4-11).
 *
 * Each action becomes a short status line, read out by screen readers. Copying the link or the
 * image, or saving it, counts as one share of the chapter (S1-E4-05), once per open card. There
 * is no one-per-chapter limit as for quote cards (Q17 is about a chapter's text going out bit by
 * bit; a picture card carries no text from the chapter).
 * Who calls it: PictureCardDialog. What it calls: lib/clipboard.ts, lib/cardImage.ts and
 * lib/countShare.ts.
 */
import { useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { trackEvent } from '@/lib/analytics/track';
import type { SpotRange } from '@/lib/chapter-blocks';

import type { ChapterAddress } from '../api/sharing';
import { downloadPicture, pictureOf } from '../lib/cardImage';
import { copyPicture, copyText } from '../lib/clipboard';

/**
 * Follows the card's actions.
 *
 * @param address - the chapter
 * @param link - the picture's full link
 * @param canvasRef - the drawn card
 * @param range - the picture's block, so the share counts for that paragraph too (IDEAS-1d)
 * @returns copyLink(), copyImage(), saveImage(), status and isWorking
 */
export function usePictureCardActions(
  address: ChapterAddress,
  link: string,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  range: SpotRange | null,
) {
  const { t } = useTranslation('sharing');
  const [hasCounted, setHasCounted] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [status, setStatus] = useState('');

  /** Counts the share once per open card, in the background. */
  function countOnce() {
    if (hasCounted) return;
    setHasCounted(true);
    void import('../lib/countShare').then((module) => module.countShare(address, 'copy_link', range));
  }

  /** Runs one action on the drawn card and turns failures into a status line. */
  async function runOnCard(action: (picture: Blob) => Promise<string>) {
    const canvas = canvasRef.current;
    if (canvas === null || isWorking) return;
    setIsWorking(true);
    try {
      setStatus(await action(await pictureOf(canvas)));
    } catch (error) {
      console.warn('The picture card failed.', error);
      setStatus(t('picture.failed'));
    } finally {
      setIsWorking(false);
    }
  }

  const copyLink = async () => {
    const copied = await copyText(link);
    setStatus(t(copied ? 'picture.copiedLink' : 'picture.copyLinkFailed'));
    if (copied) countOnce();
  };
  const copyImage = () =>
    runOnCard(async (picture) => {
      const copied = await copyPicture(picture);
      if (copied) countOnce();
      return t(copied ? 'picture.copiedImage' : 'picture.copyImageFailed');
    });
  const saveImage = () =>
    runOnCard(async (picture) => {
      downloadPicture(picture, t('picture.fileName'));
      countOnce();
      // No properties: never the picture or the chapter (docs/analytics-events.md).
      trackEvent('picture_card_saved', {});
      return t('picture.savedImage');
    });
  return { copyLink, copyImage, saveImage, status, isWorking };
}
