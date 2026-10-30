/**
 * The home page editor's fields, in the board's order, with their limits (story S1-E11-06
 * criterion 3 and the proposed limits of criterion 5).
 *
 * Who calls it: HomePageEditor. The paths are the database's field names, so a field the server
 * refuses is named the same way here.
 */
import { homePageLimits, type HomePageContent } from '@/schemas/websiteContent';

/** One field: its path, its limit and whether it is a few lines long. */
export interface HomePageField {
  path: string;
  limit: number;
  isMultiline: boolean;
}

/**
 * A field.
 *
 * @returns the field
 */
function field(path: string, limit: number, isMultiline = false): HomePageField {
  return { path, limit, isMultiline };
}

/** The hero's fields. */
export const heroFields: HomePageField[] = [
  field('eyebrow', homePageLimits.eyebrow),
  field('headlineFirst', homePageLimits.headline),
  field('headlineSecond', homePageLimits.headline),
  field('underlinedWord', homePageLimits.headline),
  field('lede', homePageLimits.lede, true),
  field('primaryButton', homePageLimits.button),
  field('secondaryButton', homePageLimits.button),
  ...[0, 1, 2].map((index) => field(`points.${String(index)}`, homePageLimits.point)),
];

/** The fields below the hero: why write here, safety and the questions heading. */
export const sectionFields: HomePageField[] = [
  field('whyHeading', homePageLimits.sectionHeading),
  ...[0, 1, 2, 3].flatMap((index) => [
    field(`whyCards.${String(index)}.title`, homePageLimits.cardTitle),
    field(`whyCards.${String(index)}.body`, homePageLimits.cardBody, true),
  ]),
  field('safetyHeading', homePageLimits.sectionHeading),
  field('safetyLines.0', homePageLimits.safetyLine, true),
  field('safetyLines.1', homePageLimits.safetyLine, true),
  field('questionsHeading', homePageLimits.sectionHeading),
];

/**
 * An empty home page, for a market and language with no version yet.
 *
 * @returns the content with every field empty
 */
export function emptyHomePage(): HomePageContent {
  return {
    eyebrow: '',
    headlineFirst: '',
    headlineSecond: '',
    underlinedWord: '',
    lede: '',
    primaryButton: '',
    secondaryButton: '',
    points: ['', '', ''],
    whyHeading: '',
    whyCards: [0, 1, 2, 3].map(() => ({ title: '', body: '' })),
    safetyHeading: '',
    safetyLines: ['', ''],
    questionsHeading: '',
  };
}
