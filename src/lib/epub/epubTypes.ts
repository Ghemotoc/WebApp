/**
 * The shapes the EPUB builder takes (story S1-E13-05, PRIVACY part f; Robert, 1 Nov 2026, 06:31
 * to 06:40: a completed story as an EPUB for Kindle and other e-readers).
 *
 * The builder knows nothing about the database or the screen: a caller gathers the published
 * chapters, the cover and the pictures, translates the words, then calls buildEpub().
 * Who uses it: src/features/data-export/lib/runEpub.ts.
 */

/** A picture ready for the book: PNG or JPEG bytes and its size in pixels. */
export interface EpubImage {
  data: Uint8Array;
  type: 'png' | 'jpg';
  width: number;
  height: number;
}

/** A music or video card, printed as a line with its link. */
export interface EpubEmbed {
  title: string;
  url: string;
}

/** One chapter, as it goes into the book. */
export interface EpubChapter {
  /** "Chapter 3: The storm", already put together. */
  heading: string;
  /** The published text: the stored Markdown subset (ADR 0005). */
  markdown: string;
}

/** Every word the book prints that isn't the writer's, already translated and filled in. */
export interface EpubWords {
  /** The table of contents' heading ("Contents"). */
  contents: string;
  /** The copyright page's heading, for the table of contents ("Copyright"). */
  copyrightHeading: string;
  /** The copyright page's lines, placeholders already filled in. */
  copyrightLines: string[];
  /** "By {{name}}" filled in, for the title page. */
  byLine: string;
  /** The cover picture's description. */
  coverAlt: string;
  /** The line a picture that couldn't be included leaves: "Picture: {{alt}}". */
  pictureMissing: (altText: string) => string;
  /** The line before a music or video link: "Music or video: {{title}}". */
  embedLine: (title: string) => string;
  /** The words for a card whose details are gone. */
  embedMissing: string;
}

/**
 * A sample of some chapters for beta readers (IDEAS-2b; idea IDEA-20261101-3): the title page and
 * the copyright page say so and list the chapters it holds.
 */
export interface EpubSample {
  /** "Sample", printed under the title and on the copyright page. */
  label: string;
  /** "This sample holds:", before the list of chapters. */
  holdsLine: string;
}

/**
 * The optional "About the writer" page at the back (IDEAS-2b; idea IDEA-20261101-4): the public
 * bio and a link to the public profile, only when the writer ticked it.
 */
export interface EpubAboutWriter {
  /** "About the writer". */
  heading: string;
  /** The public bio, or an empty text when there is none. */
  bio: string;
  /** "More from {{name}}:", before the link. */
  linkLine: string;
  /** The public profile's full address. */
  profileUrl: string;
}

/** The whole book. */
export interface EpubBook {
  title: string;
  /** The name printed on the book: the pen name, or any name the writer typed (never stored). */
  author: string;
  /** The story's language code ("ro", "en"). */
  languageCode: string;
  /** A stable identifier for the book (the story's ID). */
  identifier: string;
  /** When the file was made, as an ISO date and time. */
  madeAt: string;
  cover: EpubImage | null;
  chapters: EpubChapter[];
  /** The chapter pictures, by their IDs in the text. */
  pictures: ReadonlyMap<string, EpubImage>;
  embeds: ReadonlyMap<string, EpubEmbed>;
  words: EpubWords;
  /** Set for a sample of some chapters; null for the whole book (IDEAS-2b). */
  sample: EpubSample | null;
  /** Set when the writer ticked "Add an About the writer page"; null otherwise (IDEAS-2b). */
  aboutWriter: EpubAboutWriter | null;
}
