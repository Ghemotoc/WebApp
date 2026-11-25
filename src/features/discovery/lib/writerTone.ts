/**
 * writerTone: the classes a list of suggested writers uses in each tone (story S1-E5-11; kept
 * apart from the components since user story 1.4, so both lists share them).
 *
 * Who uses it: components/SuggestedWriterRow.tsx and components/RisingWritersList.tsx.
 * What it calls: nothing; the colours come from the tokens through Tailwind classes.
 */

/** Where a list of writers sits: on the page's own background, or inside the dark writers' band. */
export type RisingWritersTone = 'plain' | 'band';

/** The classes that change with the tone, so the rows stay free of conditions. */
export const writerToneClasses: Record<
  RisingWritersTone,
  { heading: string; row: string; name: string; meta: string }
> = {
  plain: {
    heading: 'type-subheading',
    row: 'border-(--hairline)',
    name: 'text-ink',
    meta: 'type-meta',
  },
  band: {
    // Display font, 20/28, in the band's text colour (board A01, 23 Nov 2026).
    heading: 'font-heading type-subheading leading-7 font-bold text-on-primary',
    row: 'border-on-primary/14',
    name: 'text-on-primary',
    meta: 'type-meta leading-[18px] text-on-primary/72',
  },
};
