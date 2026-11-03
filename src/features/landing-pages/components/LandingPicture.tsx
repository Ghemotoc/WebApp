/**
 * LandingPicture: a picture in a landing page's Hero or Text block, with its alt text in the
 * reader's language (story S1-E11-14 criterion 5; bundle CONTESTS-13a2a).
 *
 * Visitors only ever get a picture that passed its check and a moderator approved (the database
 * hands out no other file), so a missing or unchecked picture simply isn't drawn. The editor's
 * preview, which can see a picture still being checked, says so in words instead of drawing it.
 * Who shows it: LandingPageView (hero) and LandingBlockView (text). What it calls: nothing.
 */
import type { PictureView } from '@/features/pictures/api/pictures';
import type { LandingBlock, LandingLanguage } from '@/schemas/landingPages';

import { wordsOf } from '../lib/blocks';
import { useLandingPageTranslation } from '../registerLandingPageTranslations';

/** What the picture needs. */
interface LandingPictureProps {
  block: LandingBlock;
  language: LandingLanguage;
  pictures: Record<string, PictureView>;
  /** True in the editor's preview: a picture not ready yet is named, not hidden. */
  isPreview?: boolean;
}

/**
 * Renders the picture, a note in the preview, or nothing.
 *
 * @returns the figure
 */
export function LandingPicture({
  block,
  language,
  pictures,
  isPreview = false,
}: LandingPictureProps) {
  const { t } = useLandingPageTranslation();
  if (block.picture_id === undefined) return null;
  const view = pictures[block.picture_id];
  // Step 1: a picture that is ready, with its alt text.
  if (view?.state === 'visible' && view.url !== null) {
    return (
      <img
        src={view.url}
        alt={wordsOf(block, language, 'alt')}
        className="block h-auto w-full max-w-full rounded-card"
        loading="lazy"
      />
    );
  }
  // Step 2: in the preview only, say why it isn't drawn yet.
  if (!isPreview) return null;
  return (
    <p className="m-0 rounded-card border border-dashed border-border p-4 text-sm text-meta">
      {t(`picture.states.${view?.state ?? 'checking'}`)}
    </p>
  );
}
