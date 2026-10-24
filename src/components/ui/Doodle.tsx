/**
 * Doodle: one of the hand-drawn, fine-ink pictures that decorate a page (story S1-E3-01 builds
 * it first; DoD design rules, doodles; Robert, chat, 17 Oct 2026).
 *
 * The rules:
 *   - Every doodle is one of two kinds and says so in code: a background doodle belongs to a page
 *     band (data-doodle="background") and may move or disappear as the layout reflows; a widget
 *     doodle belongs to one component (data-doodle="widget", data-doodle-on naming it) and travels
 *     with it on every screen size.
 *   - Each has a breakpoint rule: hideBelow="wide" hides it under 1000 px (class tmc-dd-wide),
 *     hideBelow="phone" under 600 px (tmc-dd-hide); src/styles/index.css holds both.
 *   - Decorative only: alt="", aria-hidden, no pointer events, and never over or touching text,
 *     buttons, links, fields or navigation at any width. e2e/support/doodles.ts renders each
 *     screen at 390, 768 and 1440 px and fails when a doodle's box meets a control or a line of
 *     text.
 *   - Always an SVG file (CLAUDE.md rule 16), copied from design/assets/ into src/assets/doodles/
 *     with a readable name; never on the chapter reader, sharing, reporting or staff screens.
 * Colours: the files carry the boards' own ink and paper colours for now. Lane B is adding
 * --doodle-* tokens (src/styles/tokens.css) and recolouring the files to use them; when that
 * lands, only this component and the files change.
 * Who uses it: page headers and cards in the writer screens (S1-E3), the story page and the
 * teaser (S1-E4-04); other lanes reuse it for their screens.
 */
import { cn } from '@/lib/utils';

import { doodleSources, type DoodleName } from './doodleSources';

/** What a Doodle needs. */
export interface DoodleProps {
  name: DoodleName;
  /** background: belongs to a page band; widget: belongs to one component. */
  kind: 'background' | 'widget';
  /** For a widget doodle, the component it belongs to (data-doodle-on). */
  on?: string;
  /** wide: hidden under 1000 px; phone: hidden under 600 px; always: never hidden. */
  hideBelow: 'wide' | 'phone' | 'always';
  /** Position and size, for example "absolute -top-6 right-4 w-16 rotate-6". */
  className?: string;
}

/** The breakpoint class for each rule (src/styles/index.css). */
const hideClasses = { wide: 'tmc-dd-wide', phone: 'tmc-dd-hide', always: '' } as const;

/**
 * Renders the doodle as a decorative image.
 *
 * @returns the image, hidden from screen readers and from the pointer
 */
export function Doodle({ name, kind, on, hideBelow, className }: DoodleProps) {
  return (
    <img
      src={doodleSources[name]}
      alt=""
      aria-hidden="true"
      data-doodle={kind}
      data-doodle-on={on}
      className={cn('pointer-events-none z-0 select-none', hideClasses[hideBelow], className)}
    />
  );
}
