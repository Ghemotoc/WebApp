/**
 * The quote card's "Story cover" background when the cover is drawn or automatic (bundle GAPS-7,
 * part b; board 3.6 Share): the cover's own background colour, with dark or light words to suit.
 *
 * A drawn cover gives the colour the writer chose; an automatic one gives the colour of the
 * design drawn from the story's ID, the same design every other screen shows (S1-E3-13). An
 * uploaded cover is a picture and is handled by useCardBackground; while it can't be shown (still
 * in its check, removed or hidden), the automatic cover's colour stands in, as on every screen.
 * Who calls it: hooks/useCardBackground.ts. What it calls: the covers code in
 * src/components/covers/.
 */
import { resolveCoverChoice } from '@/components/covers/automaticCover';
import {
  coverColourKeys,
  coverDesignKeys,
  coverPalette,
  titleColourOn,
  type CoverColourKey,
  type CoverDesignKey,
  type DrawnCoverChoice,
} from '@/components/covers/coverDesigns';

import type { SharedCover } from '../api/sharing';

import type { QuoteCardBackground } from './quoteCard';

/** The key the picker uses for "Story cover". */
export const coverBackgroundKey = 'cover';

/** The dark title colour of the covers code: a surface that takes it is a light one. */
const darkWords = '#26142E';

/**
 * The writer's drawn choice, when the answer holds a complete and known one.
 *
 * @param cover - the cover from share_options()
 * @returns the design and colours, or null for an automatic or uploaded cover
 */
function drawnChoiceOf(cover: SharedCover): DrawnCoverChoice | null {
  if (cover.kind !== 'drawn') return null;
  const design = coverDesignKeys.find((key: CoverDesignKey) => key === cover.design);
  const background = coverColourKeys.find((key: CoverColourKey) => key === cover.background);
  const accent = coverColourKeys.find((key: CoverColourKey) => key === cover.accent);
  if (design === undefined || background === undefined || accent === undefined) return null;
  return { design, background, accent };
}

/**
 * Makes the colour background for a story's cover.
 *
 * @param cover - the cover from share_options()
 * @returns the background in the cover's colour
 */
export function coverColourBackground(cover: SharedCover): QuoteCardBackground {
  // Step 1: the writer's choice, or the automatic design from the story's ID.
  const drawnCover = drawnChoiceOf(cover);
  const choice = resolveCoverChoice({
    id: cover.storyId,
    coverKind: drawnCover === null ? 'automatic' : 'drawn',
    drawnCover,
  });
  // Step 2: its background colour, and whether dark words read better on it.
  const colour = coverPalette[choice.background];
  return {
    key: coverBackgroundKey,
    colours: [colour],
    isLight: titleColourOn(colour) === darkWords,
  };
}
