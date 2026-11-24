/**
 * StoryLabels: "Labels from the writer" on the story page (story S1-E3-06; since bundle CALM-7c in
 * the main column under the chapters, board New-Story and the handover's Step 3).
 *
 * A grid of labels and values, three across from 640 px and two on phones, each pair under a
 * hairline (board B01, bundle 2; DoD label rows), in the board's order: Fan fiction, Parody,
 * Rating, AI use, Language and Where to read, then the page's own: Status (until "Completed" moves to the
 * facts line, which waits for Robert's answer), First published and Comments. The rating row adds "hidden
 * from readers under 16" for 16+ and 18+, which says what the rating does. While the writer has
 * paused new comments, the Comments row says until when, in the reader's own local time (bundles
 * CALM-8 and CALM-8b). Under the list, "Content notes from the writer" with the writer's words,
 * when they left a note (S1-E3-06: readers see it before they open a chapter).
 * The board's "Quote cards" row waits for get_story_page() to send that setting (a follow-up).
 * Who uses it: StoryPage. What it calls: the pause helpers in lib/comment-pause.
 */
import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { runningPauseEnd } from '@/lib/comment-pause';
import { formatLocalDayAndTime } from '@/lib/local-time';
import { ratingMinimumAge } from '@/schemas/story';

import type { StoryPageData } from '../api/storyPage';

/** The rating row: "16+ · hidden from readers under 16"; All ages and 13+ say only the name. */
function ratingRowText(rating: StoryPageData['labels']['rating'], t: TFunction<'reading'>) {
  const name = t(`rating.${rating}`, { ns: 'writing' });
  // Nobody under 13 has an account, so 13+ hides the story from no reader (docs/board-fixes.md).
  if (rating === 'all_ages' || rating === '13_plus') return name;
  return t('storyPage.ratingHidden', { rating: name, age: ratingMinimumAge[rating] });
}

/** The fan fiction row: "Yes", or "No, original story" (board New-Story). */
function fanFictionRowText(labels: StoryPageData['labels'], t: TFunction<'reading'>) {
  return labels.isFanFiction ? t('storyPage.yes') : t('storyPage.originalStory');
}

/** Where the story can be read: everywhere, or only in the app (S1-E3-08, GAPS-15; board B01). */
function whereToReadText(story: StoryPageData, t: TFunction<'reading'>) {
  return story.appOnly ? t('storyPage.appOnlyPill') : t('storyPage.readOnWebAndApps');
}

/** The AI row: the writer's answer, or the staff label when one was added (Q24). */
function aiRowText(labels: StoryPageData['labels'], t: TFunction<'reading'>) {
  if (labels.aiUndisclosedLabelled) return t('aiDisclosure.undisclosed', { ns: 'writing' });
  return t(`aiDisclosure.${labels.aiDisclosure}`, { ns: 'writing' });
}

/**
 * The year shown as "First published" (Robert, 6 Nov 2026): for a classic, the year the work was
 * first published anywhere, as staff saved it (none while it isn't confirmed); for a writer's own
 * story, the year its first chapter went out here, so it fills itself in the moment the story
 * starts.
 *
 * @param story - the story page's data
 * @returns the year, or null while nothing is published yet (the row is then left out)
 */
function firstPublishedYear(story: StoryPageData): number | null {
  // Step 1: a classic shows only its real publication year, never the day we added it here;
  // a classic whose year isn't confirmed yet shows no row.
  const classicAuthor = story.writer.classicAuthor;
  if (classicAuthor !== null) return classicAuthor.firstPublishedYear;
  // Step 2: otherwise the year of the first published chapter, in the reader's own time zone.
  if (story.firstPublishedAt === null) return null;
  return new Date(story.firstPublishedAt).getFullYear();
}

/**
 * The "First published" row, or nothing while the story has no published chapter.
 *
 * @returns zero or one label row
 */
function firstPublishedRows(story: StoryPageData, t: TFunction<'reading'>) {
  const year = firstPublishedYear(story);
  if (year === null) return [];
  return [{ label: t('storyPage.firstPublishedLabel'), value: String(year) }];
}

/** One label and its value. */
interface LabelPair {
  label: string;
  value: ReactNode;
}

/**
 * The comments row: "Off", "On", or while the writer has paused new comments, "Paused until
 * Saturday 21 November, 18:40" (bundle CALM-8; the reader's own time, CALM-8b), the end written the way the paused
 * line under a chapter writes it.
 *
 * @param story - the story page's data
 * @param t - the reading namespace's translate function
 * @param language - the interface language, for the date
 * @returns the Comments row
 */
function commentsRows(story: StoryPageData, t: TFunction<'reading'>, language: string) {
  const label = t('storyPage.commentsLabel');
  if (!story.commentsEnabled) return [{ label, value: t('storyPage.commentsOff') }];
  // The page was read a little while ago, so a pause that has ended since counts as none.
  const pauseEnd = runningPauseEnd(story.commentsPausedUntil, new Date());
  if (pauseEnd === null) return [{ label, value: t('storyPage.commentsOn') }];
  const when = formatLocalDayAndTime(pauseEnd, language);
  return [{ label, value: t('storyPage.commentsPaused', { when }) }];
}

/**
 * Every row of the list, in the board's order, then the page's own rows.
 *
 * @param story - the story page's data
 * @param t - the reading namespace's translate function
 * @param language - the interface language, for dates
 * @returns the rows
 */
function labelRowsFor(
  story: StoryPageData,
  t: TFunction<'reading'>,
  language: string,
): LabelPair[] {
  const { labels } = story;
  return [
    { label: t('storyPage.fanFictionLabel'), value: fanFictionRowText(labels, t) },
    {
      label: t('storyPage.parodyLabel'),
      value: labels.isParody ? t('storyPage.yes') : t('storyPage.no'),
    },
    { label: t('storyPage.ratingLabel'), value: ratingRowText(labels.rating, t) },
    { label: t('storyPage.aiLabel'), value: aiRowText(labels, t) },
    {
      label: t('storyPage.languageLabel'),
      value: (
        <span lang={story.languageCode}>
          {t(`languages.${story.languageCode}`, {
            ns: 'writing',
            defaultValue: story.languageCode,
          })}
        </span>
      ),
    },
    { label: t('storyPage.whereToReadLabel'), value: whereToReadText(story, t) },
    // Board B01 says the state in the facts line instead; until Robert answers whether
    // "Completed" goes there (asked through DESIGN, 24 Nov 2026), it stays here.
    {
      label: t('storyPage.statusLabel'),
      value: t(`status.${story.completionStatus}`, { ns: 'writing' }),
    },
    ...firstPublishedRows(story, t),
    ...commentsRows(story, t, language),
  ];
}

/**
 * The grid (board B01): each label small above its value, under a hairline, 32 px between columns.
 *
 * @returns the description list
 */
function LabelGrid({ pairs }: { pairs: LabelPair[] }) {
  return (
    <dl className="m-0 grid grid-cols-2 gap-x-8 sm:grid-cols-3">
      {pairs.map((pair) => (
        <div key={pair.label} className="border-t border-(--hairline) py-3">
          <dt className="mb-1 type-meta text-ink-muted">{pair.label}</dt>
          <dd className="m-0 type-body break-words text-ink-heading">{pair.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Renders the section.
 *
 * @param props.story - the story page's data
 * @returns the heading, the list and the content note
 */
export function StoryLabels({ story }: { story: StoryPageData }) {
  const { t, i18n } = useTranslation('reading');
  return (
    <section aria-labelledby="story-labels-heading" className="flex flex-col gap-3">
      <h2 id="story-labels-heading" className="m-0 type-heading text-ink-heading">
        {t('storyPage.labelsHeading')}
      </h2>
      <LabelGrid pairs={labelRowsFor(story, t, i18n.language)} />
      {story.labels.contentNote !== '' && (
        <div className="mt-3 flex flex-col gap-2">
          <h3 className="m-0 type-label font-semibold text-ink-heading">
            {t('storyPage.contentNoteHeading')}
          </h3>
          <p lang={story.languageCode} className="m-0 type-body text-ink-muted">
            {story.labels.contentNote}
          </p>
        </div>
      )}
    </section>
  );
}
