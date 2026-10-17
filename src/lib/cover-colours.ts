/**
 * The colour pairs for drawn covers (story S1-E1-03).
 *
 * Source: the boards' cover classes (.tmc-cv-plum, -ink, -violet, -gold, -lilac, -blush, -sky,
 * -sage, -paper) give the backgrounds; each title colour is the board's title ink for that cover.
 * Covers are artwork, so they keep these colours in night mode too.
 * Who uses it: StoryCard now; the automatic covers (S1-E3-13) choose a tone from the story ID.
 * src/lib/cover-colours.test.ts checks every pair for contrast.
 */

/** The cover tones the boards draw. */
export type CoverTone =
  'plum' | 'ink' | 'violet' | 'gold' | 'lilac' | 'blush' | 'sky' | 'sage' | 'paper';

/** Background and title colour for each tone. */
export const coverColours: Record<CoverTone, { background: string; title: string }> = {
  plum: { background: '#481C5F', title: '#FBF7EC' },
  ink: { background: '#26142E', title: '#FBF7EC' },
  violet: { background: '#672786', title: '#FBF7EC' },
  gold: { background: '#E6C24C', title: '#2A0E33' },
  lilac: { background: '#E9DDF0', title: '#481C5F' },
  blush: { background: '#F6D3DC', title: '#481C5F' },
  sky: { background: '#D7E6F2', title: '#16233A' },
  sage: { background: '#C9D8BF', title: '#1F4A36' },
  paper: { background: '#FAF8F5', title: '#481C5F' },
};
