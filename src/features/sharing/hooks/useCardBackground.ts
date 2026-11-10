/**
 * useCardBackground: which background the quote card is drawn on, and the choices the picker
 * offers (story S1-E4-07, fourth criterion; bundle GAPS-7, parts b and c; board 3.6 Share:
 * "Background: Purple | Story cover | + Your own picture").
 *
 * The reader's own choice wins. Until they make one, the card is in the writer's colour when they
 * picked one (IDEAS-1c), otherwise our purple. "Story cover" is the cover's colour for a drawn or
 * automatic cover, and the picture itself (blurred on the card) for an uploaded cover that passed
 * its check. "Own picture" is the reader's checked picture. A picture choice that can't be drawn
 * yet leaves the card on the default until it can.
 * Who calls it: QuoteCardDialog. What it calls: useShareOptions, useStoryCoverPicture,
 * usePictureBitmap and useQuoteCardPicture.
 */
import { useMemo, useState } from 'react';

import { useStoryCoverPicture } from '@/features/pictures/hooks/usePictures';

import type { ChapterAddress, SharedCover } from '../api/sharing';
import { coverBackgroundKey, coverColourBackground } from '../lib/coverBackground';
import {
  backgroundByKey,
  pictureBackground,
  purpleBackground,
  type QuoteCardBackground,
} from '../lib/quoteCard';

import { usePictureBitmap } from './usePictureBitmap';
import { useQuoteCardPicture, type QuoteCardPicture } from './useQuoteCardPicture';
import { useShareOptions } from './useShareOptions';

/** The key the picker uses for the reader's own picture. */
export const ownBackgroundKey = 'own';

/** What the reader chose: one of the colours, the story's cover or their own picture. */
type BackgroundChoice =
  { kind: 'colour'; background: QuoteCardBackground } | { kind: 'cover' } | { kind: 'own' };

/** What the hook gives. */
export interface CardBackground {
  /** The background the card is drawn on now. */
  background: QuoteCardBackground;
  /** The picker's pressed choice: a colour's key, 'cover' or 'own'. */
  chosenKey: string;
  chooseColour: (background: QuoteCardBackground) => void;
  /** True once the story's cover is known, so "Story cover" can be offered. */
  hasCover: boolean;
  chooseCover: () => void;
  chooseOwn: () => void;
  /** The reader's own picture: its state, upload and removal. */
  own: QuoteCardPicture;
}

/**
 * The "Story cover" background: the uploaded picture once it may be drawn, otherwise the cover's
 * colour.
 *
 * @param storySlug - the story's address
 * @param cover - the cover from share_options(), or null while unknown
 * @returns the background, or null while the cover is unknown
 */
function useCoverBackground(
  storySlug: string,
  cover: SharedCover | null,
): QuoteCardBackground | null {
  // Step 1: an uploaded cover's picture, by the cover's own rules (story_cover_picture()).
  const picture = useStoryCoverPicture(storySlug, cover?.kind === 'upload');
  const view = picture.data ?? null;
  const { bitmap } = usePictureBitmap(view?.state === 'visible' ? view.url : null);
  // Step 2: the picture when there is one, otherwise the colour; kept stable between draws.
  return useMemo(() => {
    if (cover === null) return null;
    if (bitmap !== null) return pictureBackground(coverBackgroundKey, bitmap);
    return coverColourBackground(cover);
  }, [cover, bitmap]);
}

/**
 * Decides the card's background.
 *
 * @param address - the chapter the card is made from
 * @returns the background, the pressed choice and the ways to change it
 */
export function useCardBackground(address: ChapterAddress): CardBackground {
  const { cardColour, cover } = useShareOptions(address);
  const [choice, setChoice] = useState<BackgroundChoice | null>(null);
  const coverBackground = useCoverBackground(address.storySlug, cover);
  const own = useQuoteCardPicture();
  const ownBackground = useMemo(
    () => (own.bitmap === null ? null : pictureBackground(ownBackgroundKey, own.bitmap)),
    [own.bitmap],
  );
  // The default: the writer's colour, or our purple.
  let background = backgroundByKey(cardColour) ?? purpleBackground;
  if (choice?.kind === 'colour') background = choice.background;
  if (choice?.kind === 'cover' && coverBackground !== null) background = coverBackground;
  if (choice?.kind === 'own' && ownBackground !== null) background = ownBackground;
  return {
    background,
    chosenKey: background.key,
    chooseColour: (chosen) => setChoice({ kind: 'colour', background: chosen }),
    hasCover: coverBackground !== null,
    chooseCover: () => setChoice({ kind: 'cover' }),
    chooseOwn: () => setChoice({ kind: 'own' }),
    own,
  };
}
