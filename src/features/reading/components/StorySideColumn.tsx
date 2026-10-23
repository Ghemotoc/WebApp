/**
 * StorySideColumn: the writer card, "Labels from the writer" and "Report this story" beside the
 * story (story S1-E3-05; board Story 3.4, the side column).
 *
 * Board values: the writer card (name, 22 px; the bio, numbers, Follow and "See profile" come
 * with S1-E5-05 and S1-E6-05), the label rows with a fine line between them (LabelRows: language,
 * rating, labels, AI, status, comments; "Where to read" joins with S1-E3-08) and the "Report
 * this story" link. The content note sits in StoryHeader, under the blurb. The mug and the mushroom doodles sit on the card
 * corners as on the board.
 * Report button (CLAUDE.md rule 6): Lane C's <ReportButton> from src/features/reporting replaces
 * ReportStoryLink when S1-E10-01 lands; until then it opens an email to the support address with
 * the story's address in the subject (docs/mocks.md).
 * Who uses it: StoryPage.
 */
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { Doodle } from '@/components/ui/Doodle';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { LabelRows } from '@/components/ui/LabelRows';
import { brand } from '@/config/brand';
import { ratingMinimumAge } from '@/schemas/story';

import type { StoryPageData } from '../api/storyPage';

/**
 * The stub report link: an email to the support address (the hook for Lane C's ReportButton).
 *
 * @returns the link
 */
function ReportStoryLink({ slug }: { slug: string }) {
  const { t } = useTranslation('reading');
  const subject = encodeURIComponent(t('storyPage.reportSubject', { slug }));
  return (
    <a
      href={`mailto:${brand.contactEmail}?subject=${subject}`}
      className="inline-flex min-h-11 items-center text-sm font-semibold text-body"
    >
      {t('storyPage.report')}
    </a>
  );
}

/**
 * The writer card: pen name or username and the handle (the bio, numbers, Follow and
 * "See profile" come with S1-E5-05 and S1-E6-05), with the mug doodle on its corner.
 *
 * @returns the card
 */
function WriterCard({ writer }: { writer: StoryPageData['writer'] }) {
  const { t } = useTranslation('reading');
  return (
    <div className="relative flex flex-col gap-2 rounded-card border border-border bg-surface p-6 shadow-card">
      {/* Kept to its own width, so the mug in the corner never shares a box with the text. */}
      <div className="w-fit">
        <Eyebrow>{t('storyPage.writerEyebrow')}</Eyebrow>
      </div>
      <h2 className="m-0 font-heading text-[22px] font-bold text-heading">{writer.displayName}</h2>
      <p className="m-0 text-[13px] text-meta">@{writer.handle}</p>
      <Doodle
        name="mug"
        kind="widget"
        on="The writer"
        hideBelow="phone"
        className="absolute -top-7 -right-2 w-[62px] rotate-[10deg]"
      />
    </div>
  );
}

/** The rating row: "16+ · hidden from readers under 16"; All ages and 13+ say only the name. */
function ratingRowText(rating: StoryPageData['labels']['rating'], t: TFunction<'reading'>) {
  const name = t(`rating.${rating}`, { ns: 'writing' });
  // Nobody under 13 has an account, so 13+ hides the story from no reader (docs/board-fixes.md).
  if (rating === 'all_ages' || rating === '13_plus') return name;
  return t('storyPage.ratingHidden', { rating: name, age: ratingMinimumAge[rating] });
}

/** The labels row: "Fan fiction", "Parody", both, or "None". */
function labelsRowText(labels: StoryPageData['labels'], t: TFunction<'reading'>) {
  const names: string[] = [];
  if (labels.isFanFiction) names.push(t('pills.fanFiction', { ns: 'writing' }));
  if (labels.isParody) names.push(t('pills.parody', { ns: 'writing' }));
  return names.length === 0 ? t('storyPage.noLabels') : names.join(' · ');
}

/** The AI row: the writer's answer, or the staff label when one was added (Q24). */
function aiRowText(labels: StoryPageData['labels'], t: TFunction<'reading'>) {
  if (labels.aiUndisclosedLabelled) return t('aiDisclosure.undisclosed', { ns: 'writing' });
  return t(`aiDisclosure.${labels.aiDisclosure}`, { ns: 'writing' });
}

/**
 * Renders the column.
 *
 * @returns the side column
 */
export function StorySideColumn({ story }: { story: StoryPageData }) {
  const { t } = useTranslation('reading');
  return (
    <aside className="flex flex-col gap-5">
      <WriterCard writer={story.writer} />
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card">
        <h2 className="m-0 font-eyebrow text-sm font-normal text-eyebrow">
          {t('storyPage.labelsHeading')}
        </h2>
        <LabelRows
          rows={[
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
            {
              label: t('storyPage.ratingLabel'),
              value: ratingRowText(story.labels.rating, t),
            },
            { label: t('storyPage.labelsLabel'), value: labelsRowText(story.labels, t) },
            { label: t('storyPage.aiLabel'), value: aiRowText(story.labels, t) },
            {
              label: t('storyPage.statusLabel'),
              value: t(`status.${story.completionStatus}`, { ns: 'writing' }),
            },
            {
              label: t('storyPage.commentsLabel'),
              value: story.commentsEnabled ? t('storyPage.commentsOn') : t('storyPage.commentsOff'),
            },
          ]}
        />
      </div>
      <div className="relative flex items-center">
        <ReportStoryLink slug={story.slug} />
        <Doodle
          name="mushroom"
          kind="widget"
          on="Report this story"
          hideBelow="phone"
          className="absolute right-3 -bottom-1 w-[60px] rotate-6"
        />
      </div>
    </aside>
  );
}
