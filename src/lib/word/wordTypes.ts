/**
 * The shapes the shared Word builder takes (story S1-E13-02 builds it; S1-E11-09a and S1-E13-05
 * reuse it, so nobody builds a second one).
 *
 * The builder knows nothing about the database or the screen: a caller turns its rows into a
 * WordStory, translates the labels and loads the pictures, then calls storyToWord().
 * Who uses it: src/features/data-export/ today; staff data requests and Download my stories next.
 */

/** One chapter, as it goes into the file. */
export interface WordChapter {
  /** Its place in the story, from 1. */
  position: number;
  /** Its title, or null when the writer gave none. */
  title: string | null;
  /** Its status in the reader's words ("Published", "Draft", "Scheduled"). */
  statusLabel: string;
  createdAt: string;
  firstPublishedAt: string | null;
  lastPublishedAt: string | null;
  /** The chapter's text: the stored Markdown subset (ADR 0005). */
  markdown: string;
}

/** One story, as it goes into the file (the contents rule of S1-E11-09). */
export interface WordStory {
  title: string;
  /** The pen name, or the username when there is none. */
  writerName: string;
  /** The writer's own user ID: their personal data, shown only to them (S1-E13-05). */
  userId: string;
  /** The story's language code ("ro", "en"), so screen readers and spelling use the right one. */
  languageCode: string;
  /** The story's status in the reader's words ("Ongoing", "Completed"). */
  statusLabel: string;
  createdAt: string;
  firstPublishedAt: string | null;
  updatedAt: string;
  /** Every chapter, in order. */
  chapters: WordChapter[];
}

/** A picture ready for Word: PNG or JPEG bytes and the size to draw it at, in pixels. */
export interface WordPicture {
  data: Uint8Array;
  type: 'png' | 'jpg';
  width: number;
  height: number;
}

/** A music or video card, listed as a link (S1-E11-09: embeds are listed as links). */
export interface WordEmbed {
  title: string;
  url: string;
}

/** The pictures and cards a story's chapters point to, by their IDs in the text. */
export interface WordAssets {
  pictures: ReadonlyMap<string, WordPicture>;
  embeds: ReadonlyMap<string, WordEmbed>;
}

/** Every word the file prints that isn't the writer's, already translated. */
export interface WordLabels {
  /** "By {{name}}" filled in. */
  byLine: (writerName: string) => string;
  userId: string;
  created: string;
  firstPublished: string;
  lastUpdated: string;
  lastPublished: string;
  notPublishedYet: string;
  status: string;
  /** "Chapter {{number}}" filled in. */
  chapterNumber: (position: number) => string;
  /** The line a picture that couldn't be included leaves: "Picture: {{alt}}". */
  pictureMissing: (altText: string) => string;
  /** The line before a music or video link: "Music or video: {{title}}". */
  embedLine: (title: string) => string;
  /** The words for a card whose details are gone. */
  embedMissing: string;
}

/** How a date is printed, in the reader's language (for example "17 October 2026"). */
export type WordDateFormatter = (isoDate: string) => string;

/** One "Label: value" line in a story's plan. */
export interface WordPlanDetail {
  label: string;
  value: string;
}

/** One thing in a part of the plan: a character, a bible entry, an idea and so on. */
export interface WordPlanEntry {
  /** Its name, printed as a heading, or null for a part that is only lines. */
  title: string | null;
  /** Its labelled lines, in order; empty values are left out by the caller. */
  details: WordPlanDetail[];
  /** Longer text the writer wrote in the Markdown subset (ADR 0005), or null. */
  markdown: string | null;
}

/** One part of the plan, as Story Atlas names it ("Characters", "Story bible"). */
export interface WordPlanPart {
  heading: string;
  entries: WordPlanEntry[];
}

/**
 * A story's plan from Story Atlas, as it goes into its own Word file (Robert, 1 Nov 2026, 06:27:
 * downloads hold the bible, the characters and the rest too). Parts with nothing in them are
 * left out by the caller.
 */
export interface WordPlan {
  /** "The plan of <title>" filled in. */
  title: string;
  writerName: string;
  /** The writer's own user ID: their personal data, shown only to them. */
  userId: string;
  languageCode: string;
  parts: WordPlanPart[];
  /** The line printed when the writer hasn't planned anything yet. */
  emptyNote: string;
}
