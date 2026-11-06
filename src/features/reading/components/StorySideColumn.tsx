/**
 * StorySideColumn: the writer card, "Labels from the writer" and "Report this story" beside the
 * story (story S1-E3-05; board Story 3.4, the side column).
 *
 * Board values: the writer card (name, 22 px, the bio, Follow and "See profile"; S1-E5-05 and
 * S1-E6-05; the writer's numbers stay on the profile), the label rows with a fine line between them (LabelRows: language,
 * rating, labels, AI, status, comments; "Where to read" joins with S1-E3-08) and the "Report
 * this story" link. The content note sits in StoryHeader, under the blurb. The mug and the mushroom doodles sit on the card
 * corners as on the board.
 * Report button (CLAUDE.md rule 6): Lane C's shared <ReportButton> (S1-E10-01; architecture
 * 1.7.11), which opens the one report dialog for this story. Not shown to the story's owner, who
 * can't report their own story (the database refuses it too).
 * A public-domain classic shows its real author instead of the writer card (S1-E5-06). The
 * writer card shows the writer's gold rank pill under the handle (IDEAS-3a).
 * Who uses it: StoryPage.
 */
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Doodle } from '@/components/ui/Doodle';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { LabelRows } from '@/components/ui/LabelRows';
import { FollowButton } from '@/features/people/components/FollowButton';
import { ReportButton } from '@/features/reporting/components/ReportButton';
import { ratingMinimumAge } from '@/schemas/story';

import type { ClassicAuthor, StoryPageData } from '../api/storyPage';
import { ProfileRankChip } from '@/features/forums/components/ProfileRankChip';

/**
 * Where a classic's text comes from: the source edition as a link, and the translator (S1-E11-16
 * AC 5). Classics added before the staff form have no source, so the lines are left out.
 *
 * @returns the lines, or nothing
 */
function ClassicSource({ author }: { author: ClassicAuthor }) {
  const { t } = useTranslation('reading');
  return (
    <>
      {author.translatorName !== null && (
        <p className="m-0 text-[15px] leading-normal text-body">
          {t('storyPage.classicTranslator', { name: author.translatorName })}
        </p>
      )}
      {author.sourceTitle !== null && author.sourceUrl !== null && (
        <p className="m-0 text-[15px] leading-normal text-body">
          {t('storyPage.classicSource')}{' '}
          <a
            href={author.sourceUrl}
            rel="nofollow ugc noopener"
            target="_blank"
            className="font-semibold underline underline-offset-2"
          >
            {author.sourceTitle}
          </a>
        </p>
      )}
    </>
  );
}

/**
 * The card for a public-domain classic: the real author and the year they died, with no Follow
 * and no profile, because the author has no account (S1-E5-06, 25 Oct 2026), and since S1-E11-16
 * the source edition and the translator.
 *
 * @returns the card
 */
function ClassicAuthorCard({ author }: { author: ClassicAuthor }) {
  const { t } = useTranslation('reading');
  return (
    <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-6 shadow-card">
      <Eyebrow>{t('storyPage.authorEyebrow')}</Eyebrow>
      <h2 className="m-0 font-heading text-[22px] font-bold text-heading">{author.name}</h2>
      <p className="m-0 text-[15px] leading-normal text-body">
        {t('storyPage.classicAuthorNote', { year: author.diedYear })}
      </p>
      <ClassicSource author={author} />
    </div>
  );
}

/**
 * The writer card: pen name or username, the handle, the bio and "See profile" (S1-E5-05) and
 * Follow (S1-E6-05; not on one's own story), with the mug doodle on its corner.
 *
 * @returns the card
 */
function WriterCard({ writer, isOwner }: { writer: StoryPageData['writer']; isOwner: boolean }) {
  const { t } = useTranslation('reading');
  const profileHref = `/u/${encodeURIComponent(writer.handle)}`;
  return (
    <div className="relative flex flex-col gap-2 rounded-card border border-border bg-surface p-6 shadow-card">
      {/* Kept to its own width, so the mug in the corner never shares a box with the text. */}
      <div className="w-fit">
        <Eyebrow>{t('storyPage.writerEyebrow')}</Eyebrow>
      </div>
      <h2 className="m-0 font-heading text-[22px] font-bold text-heading">{writer.displayName}</h2>
      <p className="m-0 text-[13px] text-meta">@{writer.handle}</p>
      {/* IDEAS-3a: the writer's gold rank pill, as on their profile (profile_rank()). */}
      <ProfileRankChip handle={writer.handle} />
      {writer.bio !== '' && (
        <p className="m-0 text-[15px] leading-normal break-words text-body">{writer.bio}</p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
        {!isOwner && (
          <FollowButton
            target={{ kind: 'writer', handle: writer.handle }}
            targetLabel={writer.displayName}
          />
        )}
        <Link
          to={profileHref}
          className="text-sm font-semibold text-link underline hover:text-link-hover"
        >
          {t('storyPage.seeProfile')}
        </Link>
      </div>
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
      {story.writer.classicAuthor === null ? (
        <WriterCard writer={story.writer} isOwner={story.isOwner} />
      ) : (
        <ClassicAuthorCard author={story.writer.classicAuthor} />
      )}
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card">
        <h2 className="m-0 eyebrow">{t('storyPage.labelsHeading')}</h2>
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
      {/* The Report row and its mushroom (a widget doodle on the Report button) show only to
          readers: the owner can't report their own story, and an empty row would let the
          doodle sit on the labels card. */}
      {!story.isOwner && (
        <div className="relative flex items-center">
          <ReportButton itemType="story" itemReference={story.id} itemLabel={story.title} />
          <Doodle
            name="mushroom"
            kind="widget"
            on="Report this story"
            hideBelow="phone"
            className="absolute right-3 -bottom-1 w-[60px] rotate-6"
          />
        </div>
      )}
    </aside>
  );
}
