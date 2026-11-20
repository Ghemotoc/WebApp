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
 * Corners and edge (the simplified design, Robert, 20 Nov 2026; bundle CALM-1): every cover has
 * 4 px corners at every size (--radius-cover, rounded-cover) and a 1 px hairline just inside its
 * edge (the cover-edge utility in index.css), with no shadow. They replace the boards' 8 and 16 px
 * corners and the darker 1 px border.
 * Who uses it: StoryCard (shelves), DrawnCoverPicker and StoryPreviewAside (the new story form),
 * WriterStoryCard (Your writing), and later the story page and the teaser.
 */
import type { CSSProperties } from 'react';

import { coverTitleSize, MINIMUM_COVER_TITLE_SIZE } from '@/lib/cover-title';
import { cn } from '@/lib/utils';

import {
  coverArtwork,
  coverDesignByKey,
  coverPalette,
  titleColourOn,
  titleSurfaceFor,
  type DrawnCoverChoice,
} from './coverDesigns';

/** The sizes a drawn cover is shown at, with the board's values for each. */
export type DrawnCoverSize = 'tile' | 'preview' | 'card' | 'shelf' | 'wall';

/**
 * Padding, the corner of the solid box behind the words, title size, pen name size and the accent
 * bar for each size. The cover's own corners are the same 4 px at every size (rounded-cover), so
 * they are not in this table. wordsBoxRadius keeps the words box exactly as it was before CALM-1
 * (half the boards' old cover corner); the cover kinds in bundle CALM-4 redraw that box.
 */
const sizeValues: Record<
  DrawnCoverSize,
  {
    padding: number;
    wordsBoxRadius: number;
    title: number;
    penName: number;
    bar: [number, number];
  }
> = {
  tile: { padding: 6, wordsBoxRadius: 4, title: 12, penName: 10, bar: [14, 2] },
  preview: { padding: 14, wordsBoxRadius: 8, title: 21, penName: 13, bar: [40, 3] },
  card: { padding: 22, wordsBoxRadius: 8, title: 28, penName: 13, bar: [52, 3] },
  shelf: { padding: 18, wordsBoxRadius: 8, title: 21, penName: 13, bar: [40, 3] },
  // The home page's cover wall (board Website-Home, LOOK-2): its title shrinks with the screen.
  wall: { padding: 12, wordsBoxRadius: 8, title: 20, penName: 12, bar: [28, 3] },
};

/**
 * The title's CSS font size. On the cover wall the size also follows the screen width, as on
 * the board (clamp(15px, 1.5vw, 20px)), so the three narrow columns on a phone still show the
 * whole title; it never goes below the DoD's 11 px floor.
 *
 * @param title - the story's title
 * @param size - the cover's size
 * @returns the font size, for example "21px" or "clamp(15px, 1.5vw, 20px)"
 */
function titleFontSize(title: string, size: DrawnCoverSize): string {
  const largest = coverTitleSize(title, sizeValues[size].title);
  if (size !== 'wall') return `${String(largest)}px`;
  const smallest = Math.max(MINIMUM_COVER_TITLE_SIZE, Math.round(largest * 7.5) / 10);
  const followingScreen = Math.round(largest * 0.75) / 10;
  return `clamp(${String(smallest)}px, ${String(followingScreen)}vw, ${String(largest)}px)`;
}

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
 * The words on the cover: the title, the accent line (plain designs) and the pen name, on a
 * solid box on every patterned design.
 *
 * @returns the title block
 */
function CoverWords({
  title,
  penName,
  choice,
  size,
}: Pick<DrawnCoverProps, 'title' | 'penName' | 'choice' | 'size'>) {
  const values = sizeValues[size];
  const { kind } = coverDesignByKey(choice.design);
  const { boxFill, surface } = titleSurfaceFor(choice);
  const textColour = titleColourOn(surface);

  // On every patterned design a solid box sits behind the words, so no line crosses them.
  const boxStyle: CSSProperties =
    boxFill === null
      ? {}
      : {
          backgroundColor: boxFill,
          padding: `${values.padding / 2}px ${values.padding * 0.7}px`,
          borderRadius: values.wordsBoxRadius,
          alignSelf: 'flex-start',
          maxWidth: '100%',
        };

  return (
    <span className="relative flex min-w-0 flex-col items-start gap-1.5" style={boxStyle}>
      <span
        className="font-heading leading-[1.05] font-bold break-words"
        style={{
          fontSize: titleFontSize(title, size),
          color: textColour,
          maxWidth: '100%',
        }}
      >
        {title}
      </span>
      {kind === 'plain' && (
        <span
          className="block rounded-sm"
          style={{
            width: values.bar[0],
            height: values.bar[1],
            backgroundColor: coverPalette[choice.accent],
          }}
        />
      )}
      {penName !== undefined && (
        <span
          className="font-body font-medium"
          style={{ fontSize: `${values.penName}px`, color: textColour }}
        >
          {penName}
        </span>
      )}
    </span>
  );
}

/**
 * Renders the cover: the background, the artwork, then the words at the bottom. The box keeps
 * a 5:8 shape (the boards draw 2:3, but uploads and the picture check use 5:8, so the shape stays
 * an open question); give it a width or height with className. It has 4 px corners and the
 * hairline edge, and casts no shadow (the simplified design, CALM-1).
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
  const values = sizeValues[size];
  return (
    <span
      aria-hidden={isDecorative ? 'true' : undefined}
      data-cover-design={choice.design}
      className={cn(
        'cover-edge relative box-border flex aspect-[5/8] flex-col justify-end overflow-hidden rounded-cover',
        className,
      )}
      style={{
        backgroundColor: coverPalette[choice.background],
        padding: values.padding,
      }}
    >
      <CoverArtwork choice={choice} />
      <CoverWords title={title} penName={penName} choice={choice} size={size} />
    </span>
  );
}
