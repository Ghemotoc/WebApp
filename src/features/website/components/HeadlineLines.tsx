/**
 * HeadlineLines: the two lines of the home page headline, the first in the heading colour and the
 * second in the look's accent (bundle LOGO-2; Robert, 11 Nov 2026: asked to drop the underline and
 * colour the two lines like the main company website: one line Revolver, one line violet).
 *
 * In the main look that is Revolver (#2A0E33, --heading) then the website's violet (#672786,
 * --accent); every other look uses its own heading and accent colours, and at night the second
 * line takes the night accent. The gold underline under one chosen word (S1-E11-06) is gone; the
 * stored "underlined word" stays in older page versions but nothing draws it.
 * The two lines are blocks with a space between, so the heading reads as one sentence.
 * Who uses it: HomeHero and the editor's HeroPreview. It calls nothing.
 */

/** What the headline needs. */
interface HeadlineLinesProps {
  first: string;
  second: string;
}

/**
 * Renders the two lines, to sit inside the caller's heading element.
 *
 * @param first - the first line, already with the product name filled in
 * @param second - the second line, already with the product name filled in
 * @returns the two lines
 */
export function HeadlineLines({ first, second }: HeadlineLinesProps) {
  return (
    <>
      <span className="block text-heading">{first}</span>{' '}
      <span className="block text-accent" data-headline-line="second">
        {second}
      </span>
    </>
  );
}
