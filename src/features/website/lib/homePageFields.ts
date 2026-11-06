/**
 * The home page editor's fields, in the board's order, with their limits (story S1-E11-06
 * criterion 3 and the proposed limits of criterion 5).
 *
 * Who calls it: HomePageEditor. The paths are the database's field names, so a field the server
 * refuses is named the same way here.
 */
import {
  homePageLimits,
  type HomePageContent,
  type HomeBand,
  type HomeRightsCard,
} from '@/schemas/websiteContent';

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
  // The gold "Your rights" card on the cover wall (LOOK-2). Leave all three empty to hide it.
  field('rightsCard.eyebrow', homePageLimits.rightsEyebrow),
  field('rightsCard.title', homePageLimits.rightsTitle),
  field('rightsCard.body', homePageLimits.rightsLine),
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

/** The bands that may hold words, in the page's order (LOOK-3). */
export const bandNames = ['writeBand', 'communityBand', 'firstStoryBand', 'appsBand'] as const;
export type BandName = (typeof bandNames)[number];

/**
 * One band's fields: its label, heading, text, buttons and, for the writers' band, four points.
 *
 * @param name - the band
 * @returns the fields
 */
function bandFieldsOf(name: BandName): HomePageField[] {
  const fields = [
    field(`${name}.eyebrow`, homePageLimits.bandEyebrow),
    field(`${name}.heading`, homePageLimits.bandHeading),
    field(`${name}.lede`, homePageLimits.bandLede, true),
    field(`${name}.button`, homePageLimits.bandButton),
    field(`${name}.secondaryButton`, homePageLimits.bandButton),
  ];
  if (name !== 'writeBand') return fields;
  return [
    ...fields,
    ...[0, 1, 2, 3].flatMap((index) => [
      field(`${name}.points.${String(index)}.title`, homePageLimits.bandPointTitle),
      field(`${name}.points.${String(index)}.body`, homePageLimits.bandPointBody, true),
    ]),
  ];
}

/** The bands lower down and the footer note (LOOK-3). Leave a band empty to hide it. */
export const bandFields: HomePageField[] = [
  ...bandNames.flatMap((name) => bandFieldsOf(name)),
  field('footerNote', homePageLimits.footerNote, true),
];

/**
 * An empty band, so the editor's fields have somewhere to write.
 *
 * @param name - the band; the writers' band gets four empty points
 * @returns the band with every field empty
 */
export function emptyBand(name: BandName): HomeBand {
  const band: HomeBand = { eyebrow: '', heading: '', lede: '', button: '', secondaryButton: '' };
  if (name === 'writeBand') band.points = [0, 1, 2, 3].map(() => ({ title: '', body: '' }));
  return band;
}

/**
 * A home page with every optional part present, so the editor can write into each (versions
 * saved before LOOK-2 and LOOK-3 lack them).
 *
 * @param page - the page as saved
 * @returns the page with empty parts added where they were missing
 */
export function withEveryPart(page: HomePageContent): HomePageContent {
  return {
    ...page,
    rightsCard: page.rightsCard ?? emptyRightsCard(),
    writeBand: page.writeBand ?? emptyBand('writeBand'),
    communityBand: page.communityBand ?? emptyBand('communityBand'),
    firstStoryBand: page.firstStoryBand ?? emptyBand('firstStoryBand'),
    appsBand: page.appsBand ?? emptyBand('appsBand'),
    footerNote: page.footerNote ?? '',
  };
}

/**
 * An empty "Your rights" card, so the editor's fields have somewhere to write.
 *
 * @returns the card with every field empty
 */
export function emptyRightsCard(): HomeRightsCard {
  return { eyebrow: '', title: '', body: '' };
}

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
    rightsCard: emptyRightsCard(),
    whyHeading: '',
    whyCards: [0, 1, 2, 3].map(() => ({ title: '', body: '' })),
    safetyHeading: '',
    safetyLines: ['', ''],
    questionsHeading: '',
    writeBand: emptyBand('writeBand'),
    communityBand: emptyBand('communityBand'),
    firstStoryBand: emptyBand('firstStoryBand'),
    appsBand: emptyBand('appsBand'),
    footerNote: '',
  };
}
