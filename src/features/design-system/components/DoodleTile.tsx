/**
 * DoodleTile: one doodle drawn inline with its name under it, on the /design page (Lane B,
 * "Design: doodles take their colours from the tokens", 23 Oct 2026).
 *
 * The drawing is hidden from screen readers and the caption names it, so the name is read once
 * (DoD: decorative doodles carry aria-hidden). The SVG's own width and height attributes are
 * overridden by CSS so every tile is the size asked for.
 * Who uses it: DoodleSection.
 */
import type { DoodleFile } from '../doodleFiles';

/** What a tile needs. */
export interface DoodleTileProps {
  doodle: DoodleFile;
  /** Width and height of the drawing in pixels. */
  size: number;
}

/**
 * Renders the tile as a list item.
 *
 * @returns the list item
 */
export function DoodleTile({ doodle, size }: DoodleTileProps) {
  return (
    <li
      className="flex flex-col items-center gap-1 text-center text-xs text-meta"
      data-doodle-id={doodle.id}
    >
      <span
        aria-hidden="true"
        className="block [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
        style={{ width: size, height: size }}
        // Our own artwork from design/assets/, never user input (see doodleFiles.ts).
        dangerouslySetInnerHTML={{ __html: doodle.svg }}
      />
      <span>{doodle.title}</span>
    </li>
  );
}
