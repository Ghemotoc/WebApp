/**
 * The analytics event catalogue in code: every event the app may send, with exactly the
 * properties it may carry (stories S1-E15-01 and S1-E15-03).
 *
 * Why it exists: trackEvent() only accepts names and properties from this list, so TypeScript
 * refuses an event that isn't catalogued, and src/lib/analytics/catalogue.test.ts fails the build
 * when this list and docs/analytics-events.md disagree (S1-E15-03, criterion 2).
 * The rule for every property: no personal data. No user ID, handle, email, IP address, story
 * or chapter ID, and no words a person wrote (CLAUDE.md rules 7 and 12). Values are small fixed
 * sets (a language, a category slug, a reason), never free text.
 * Who uses it: src/lib/analytics/track.ts and the screens that call trackEvent().
 */

/** Each event's properties. An event without properties takes an empty object. */
export interface AnalyticsEventProperties {
  /** The person picked another interface language in the language menu. */
  language_changed: { language: 'ro' | 'en' };
  /** An account was created through the sign-up form. */
  sign_up_completed: Record<string, never>;
  /** A writer created a story; the category's slug only. */
  story_created: { category: string };
  /** A writer published a chapter now (not scheduled). */
  chapter_published: Record<string, never>;
  /** A writer scheduled a chapter for later. */
  chapter_scheduled: Record<string, never>;
  /** Someone sent a report; the reason and the kind of item only, never the item or who. */
  report_submitted: { reason: string; item_type: string };
  /** A reader followed a writer (never who). */
  writer_followed: Record<string, never>;
  /** A reader followed a story (never which). */
  story_followed: Record<string, never>;
  /** A reader shared a chapter: copied the link or used the device's share sheet. */
  chapter_shared: { method: 'copy_link' | 'share_sheet' };
  /** A reader saved a quote card picture. */
  quote_card_saved: Record<string, never>;
  /** A reader saved a picture card (S1-E4-11). */
  picture_card_saved: Record<string, never>;
}

/** Every catalogued event's name. */
export type AnalyticsEventName = keyof AnalyticsEventProperties;

/** The names as a list, for the catalogue check against docs/analytics-events.md. */
export const analyticsEventNames: readonly AnalyticsEventName[] = [
  'language_changed',
  'sign_up_completed',
  'story_created',
  'chapter_published',
  'chapter_scheduled',
  'report_submitted',
  'writer_followed',
  'story_followed',
  'chapter_shared',
  'quote_card_saved',
  'picture_card_saved',
];
