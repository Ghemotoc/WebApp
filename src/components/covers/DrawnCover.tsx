/**
 * DrawnCover: a story cover we draw ourselves: a design, two palette colours, the title and the
 * pen name (story S1-E3-01; S1-E3-13 reuses it for automatic covers).
 *
 * The rules (DoD design rules, covers; decided 16 Oct 2026):
 *   - The full title is always shown: it wraps on spaces and its size steps down with its
 *     length (src/lib/cover-title.ts), never an ellipsis or clipping.
 *   - The title is real text; the artwork behind it is decorative and hidden from screen readers.
 *   - Dark or light title text is chosen so it always reaches 4.5:1 on its surface.
 *   - On a patterned design the words sit on a solid box, so no line crosses them (FIXES-1b;
 *     titleSurfaceFor() in coverDesigns.ts).
 * Board values (NewStory 4.2, the `cover()` sizes): tile (in the picker) 6 px padding, 12 px
 * title; preview 14 px padding, 21 px title; card 22 px padding, 28 px title. The story card on
 * shelves uses 18 px padding and a 21 px title (Discover board). The artwork is drawn on a
 * 100 × 160 canvas and scaled to the box.
 * Corners and edge: every cover has 12 px corners at every size (--radius-cover, rounded-cover;
 * the brand page's covers, Robert, 23 Nov 2026, 20:26 UTC, replacing CALM-1's 4 px) and a 1 px
 * hairline just inside its edge (the cover-edge utility in index.css), with no shadow.
 * The three looks (bundle CALM-4, handover Step 2; choice.style): Label puts the pattern behind a
 * paper label near the top (80.8% of the width, 9.6% each side, 12% from the top, 4 px corners, no
 * outline or rule: the brand page's label, Robert, 23 Nov 2026, 20:26 UTC), Big title sets
 * the title large on the plain background with a short accent rule and the pen name at the foot,
 * and Initial draws the title's first letter huge in the accent, cropped by the edge. Every size
 * inside is in cqi (1% of the cover's width; the cover-* classes in index.css), so a cover looks
 * the same at every width; under 100 px it shows the title only, because the title is written
 * beside it. The title font is Literata 600 unless the writer picked another (choice.titleFont).
 * These replace the per-size padding and title tables of S1-E3-01; `size` stays as a label for
 * tests and styles.
 * Classic covers (Robert, 26 Nov 2026): three classics draw an approved backdrop picture under the
 * same paper label instead of a pattern (ArtworkBackdrop); the other classics are plain colours.
 * Who uses it: StoryCard (shelves), DrawnCoverPicker and StoryPreviewAside (the new story form),
 * WriterStoryCard (Your writing), and later the story page and the teaser.
 */
import type { CSSProperties } from 'react';

import { coverTitleFit } from '@/lib/cover-title';
import { cn } from '@/lib/utils';

import {
  coverDesignByKey,
  coverPalette,
  titleColourOn,
  type DrawnCoverChoice,
} from './coverDesigns';
import { coverArtwork } from './coverArtwork';

/**
 * The places a drawn cover is shown. Since CALM-4 the sizes inside the cover follow its width, so
 * this only names the place (data-cover-size), for tests and for anyone reading the page.
 */
export type DrawnCoverSize = 'tile' | 'preview' | 'card' | 'shelf' | 'wall';

/** What a DrawnCover needs. */
export interface DrawnCoverProps {
  title: string;
  /** The pen name or username shown under the title; left out on picker tiles. */
  penName?: string;
  choice: DrawnCoverChoice;
  size: DrawnCoverSize;
  /**
   * True when the real title is repeated as text right beside the cover (shelf cards), so screen
   * readers don't read it twice: the whole cover is then hidden from them.
   */
  isDecorative?: boolean;
  className?: string;
}

/**
 * Draws the pattern artwork for a design in the accent colour, scaled to the cover.
 *
 * @returns the SVG, hidden from screen readers, or nothing for a plain design
 */
function CoverArtwork({ choice }: { choice: DrawnCoverChoice }) {
  const { kind } = coverDesignByKey(choice.design);
  const artwork = coverArtwork(kind);
  if (artwork.fillPath === '' && artwork.strokePath === '') return null;
  return (
    <svg
      viewBox="0 0 100 160"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      className="absolute inset-0 h-full w-full"
      style={{ color: coverPalette[choice.accent] }}
    >
      {artwork.fillPath !== '' && <path d={artwork.fillPath} fill="currentColor" />}
      {artwork.strokePath !== '' && (
        <path
          d={artwork.strokePath}
          fill="none"
          stroke="currentColor"
          strokeWidth={artwork.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/**
 * Draws an artwork design's backdrop picture (the classic covers' three approved backdrops),
 * filling the 2:3 cover behind the label. It is decoration, so it has empty alt text.
 *
 * @returns the picture, or nothing for a design without one
 */
function ArtworkBackdrop({ choice }: { choice: DrawnCoverChoice }) {
  const { artworkUrl } = coverDesignByKey(choice.design);
  if (artworkUrl === undefined) return null;
  return (
    <img
      src={artworkUrl}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

/**
 * What a Label cover draws behind its label: the backdrop picture for an artwork design, and the
 * pattern for a patterned one (a plain colour draws neither).
 *
 * @returns the backdrop and the pattern
 */
function LabelBackground({ choice }: { choice: DrawnCoverChoice }) {
  return (
    <>
      <ArtworkBackdrop choice={choice} />
      <CoverArtwork choice={choice} />
    </>
  );
}

/** The title and pen name, shared by the three looks; each look places and sizes them. */
interface CoverWordsProps {
  title: string;
  penName?: string;
}

/**
 * Label: the paper label near the top, with the title (Literata 600 at 9cqi) and the pen name
 * (Inter 500 at 5.5cqi). The label is always paper with dark ink, so it reads at 4.5:1 on every
 * pattern.
 *
 * @returns the label
 */
function LabelWords({ title, penName }: CoverWordsProps) {
  return (
    <span className="cover-label">
      <span className="cover-words-title">{title}</span>
      {penName !== undefined && <span className="cover-words-by">{penName}</span>}
    </span>
  );
}

/**
 * Big title: the title large at the top with a short accent rule under it, the pen name at the
 * foot, straight on the plain background in whichever ink reads best on it.
 *
 * @returns the words
 */
function BigTitleWords({ title, penName }: CoverWordsProps) {
  return (
    <span className="cover-inner cover-big">
      <span>
        <span className="cover-words-title">{title}</span>
        <span className="cover-big-rule" aria-hidden="true" />
      </span>
      {penName !== undefined && <span className="cover-words-by">{penName}</span>}
    </span>
  );
}

/**
 * Initial: the title and pen name at the top, above the title's first letter drawn huge in the
 * accent and cropped by the cover's bottom and right edges.
 *
 * @returns the words and the letter
 */
function InitialWords({ title, penName }: CoverWordsProps) {
  // The first letter, so "Șapte" gives "Ș"; Array.from keeps a letter with a mark whole.
  const firstLetter = Array.from(title.trim())[0] ?? '';
  return (
    <>
      <svg
        viewBox="0 0 120 180"
        preserveAspectRatio="xMinYMax slice"
        aria-hidden="true"
        focusable="false"
        className="absolute inset-0 h-full w-full"
      >
        <text className="cover-glyph" x="12" y="186">
          {firstLetter}
        </text>
      </svg>
      <span className="cover-inner cover-initial">
        <span className="cover-words-title">{title}</span>
        {penName !== undefined && <span className="cover-words-by">{penName}</span>}
      </span>
    </>
  );
}

/**
 * Renders the cover: the background, then the look the writer picked. The box is 2:3 (DESIGN,
 * 20 Nov 2026, CALM-4 check: "covers are 2:3"; bundle.css aspect-ratio 2 / 3); an upload is
 * cropped to it with object-fit: cover (StoryCoverArt). Give it a width with className. It has 12 px corners and the hairline edge, and casts
 * no shadow.
 *
 * @returns the cover
 */
export function DrawnCover({
  title,
  penName,
  choice,
  size,
  isDecorative = false,
  className,
}: DrawnCoverProps) {
  const style = choice.style ?? 'label';
  const background = coverPalette[choice.background];

  // The values the CSS reads: the accent, the title's size step (its length, its longest word and
  // the room the look leaves it) and, off the label, the ink that reads best on the background
  // (the label itself is always paper with dark ink).
  const coverStyle = {
    backgroundColor: background,
    color: titleColourOn(background),
    '--book-accent': coverPalette[choice.accent],
    '--fit': String(coverTitleFit(title, style, choice.titleFont ?? 'reading')),
  } as CSSProperties;

  return (
    <span
      aria-hidden={isDecorative ? 'true' : undefined}
      data-cover-design={choice.design}
      data-cover-style={style}
      data-cover-size={size}
      data-title-font={choice.titleFont ?? 'reading'}
      className={cn(
        'cover-book cover-edge relative box-border block aspect-[2/3] overflow-hidden rounded-cover',
        className,
      )}
      style={coverStyle}
    >
      {style === 'label' && <LabelBackground choice={choice} />}
      {style === 'label' && <LabelWords title={title} penName={penName} />}
      {style === 'big_title' && <BigTitleWords title={title} penName={penName} />}
      {style === 'initial' && <InitialWords title={title} penName={penName} />}
    </span>
  );
}
