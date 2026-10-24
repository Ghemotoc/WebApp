/**
 * DrawnCover: a story cover we draw ourselves: a design, two palette colours, the title and the
 * pen name (story S1-E3-01; S1-E3-13 reuses it for automatic covers).
 *
 * The rules (DoD design rules, covers; decided 16 Oct 2026):
 *   - The full title is always shown: it wraps on spaces and its size steps down with its
 *     length (src/lib/cover-title.ts), never an ellipsis or clipping.
 *   - The title is real text; the artwork behind it is decorative and hidden from screen readers.
 *   - Dark or light title text is chosen so it always reaches 4.5:1 on its surface.
 * Board values (NewStory 4.2, the `cover()` sizes): tile (in the picker) 6 px padding, 8 px
 * radius, 12 px title; preview 14 px padding, 16 px radius, 21 px title; card 22 px padding,
 * 16 px radius, 28 px title. The story card on shelves uses 18 px padding and a 21 px title
 * (Discover board). The artwork is drawn on a 100 × 160 canvas and scaled to the box.
 * Who uses it: StoryCard (shelves), DrawnCoverPicker and StoryPreviewAside (the new story form),
 * WriterStoryCard (Your writing), and later the story page and the teaser.
 */
import type { CSSProperties } from 'react';

import { coverTitleSize } from '@/lib/cover-title';
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
export type DrawnCoverSize = 'tile' | 'preview' | 'card' | 'shelf';

/** Padding, radius, title size, pen name size and the accent bar for each size. */
const sizeValues: Record<
  DrawnCoverSize,
  { padding: number; radius: number; title: number; penName: number; bar: [number, number] }
> = {
  tile: { padding: 6, radius: 8, title: 12, penName: 10, bar: [14, 2] },
  preview: { padding: 14, radius: 16, title: 21, penName: 13, bar: [40, 3] },
  card: { padding: 22, radius: 16, title: 28, penName: 13, bar: [52, 3] },
  shelf: { padding: 18, radius: 16, title: 21, penName: 13, bar: [40, 3] },
};

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
 * small box when the pattern behind them is busy.
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

  // On busy patterns a small paper or background box sits behind the words (the board's boxes).
  const boxStyle: CSSProperties =
    boxFill === null
      ? {}
      : {
          backgroundColor: boxFill,
          padding: `${values.padding / 2}px ${values.padding * 0.7}px`,
          borderRadius: values.radius / 2,
          alignSelf: 'flex-start',
          maxWidth: '100%',
        };

  return (
    <span className="relative flex min-w-0 flex-col items-start gap-1.5" style={boxStyle}>
      <span
        className="font-heading leading-[1.05] font-bold break-words"
        style={{
          fontSize: `${coverTitleSize(title, values.title)}px`,
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
 * a 5:8 shape; give it a width or height with className.
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
        'relative box-border flex aspect-[5/8] flex-col justify-end overflow-hidden border border-[rgba(38,20,46,0.14)]',
        className,
      )}
      style={{
        backgroundColor: coverPalette[choice.background],
        padding: values.padding,
        borderRadius: values.radius,
      }}
    >
      <CoverArtwork choice={choice} />
      <CoverWords title={title} penName={penName} choice={choice} size={size} />
    </span>
  );
}
