/**
 * StaffStoryPage: /staff/stories/:storyId, one story in the admin site (bundle ADMIN-2, part a;
 * story S1-E11-07; board AdminStory 8.11, the details and chapter list).
 *
 * It shows who owns the story (username and short user ID), its settings and status, its reports
 * and its chapters, never its words. Staff who may change stories (owner, admin, moderator) also
 * get "Who can find it" (shown, restricted or hidden), "Settings and details" and a Hide button on
 * each chapter, each with a reason (bundle ADMIN-2, part b1; S1-E11-08); then "Remove a passage"
 * under each published chapter and the version history with Restore (part b2). A writer under 18 shows
 * as "under 18" only, never their age (S1-E11-08 criterion "a writer under 18").
 * Who shows it: the router, inside StaffLayout. What it calls: useStaffStory →
 * api/staffStories.ts → admin_story_overview(); useChangeStaffStory for the changes.
 */
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { LabelRows } from '@/components/ui/LabelRows';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { StaffStoryOverview } from '../../api/staffStories';
import { useChangeStaffStory } from '../../hooks/useChangeStaffStory';
import { useStaffStory } from '../../hooks/useStaffStory';
import { useStaffStoryWords } from '../../hooks/useStaffStoryWords';
import { ShortUserId } from '../users/ShortUserId';

import { StaffStoryChapters } from './StaffStoryChapters';
import { StaffStoryHistory } from './StaffStoryHistory';
import { StaffStorySettingsForm } from './StaffStorySettingsForm';
import { StaffStoryVisibilityForm } from './StaffStoryVisibilityForm';

/**
 * The details as label rows (DoD: a fine line between label and value rows).
 *
 * @returns the rows
 */
function StoryDetails({ story }: { story: StaffStoryOverview }) {
  const { t } = useTranslation('staff');
  const words = useStaffStoryWords();
  const writer = story.ownerHandle === null ? t('shell.noHandle') : `@${story.ownerHandle}`;
  const rows = [
    {
      label: t('stories.page.writer'),
      value: (
        <Link to={`/staff/users/${story.ownerUserId}`} className="text-link underline">
          {writer}
        </Link>
      ),
    },
    { label: t('stories.columns.owner'), value: <ShortUserId userId={story.ownerUserId} /> },
    {
      label: t('stories.page.writerAge'),
      value: story.ownerIsMinor ? t('stories.under18') : t('stories.page.adult'),
    },
    { label: t('stories.columns.status'), value: words.status(story.status) },
    { label: t('stories.columns.readBy'), value: words.audience(story.readableBy) },
    { label: t('stories.columns.rating'), value: words.rating(story.rating) },
    { label: t('stories.columns.category'), value: words.category(story.categorySlug) },
    { label: t('stories.columns.language'), value: words.language(story.languageCode) },
    {
      label: t('stories.page.comments'),
      value: t(story.commentsEnabled ? 'stories.page.commentsOn' : 'stories.page.commentsOff'),
    },
    { label: t('stories.page.created'), value: words.date(story.createdAt) },
    { label: t('stories.columns.updated'), value: words.date(story.updatedAt) },
    {
      label: t('stories.columns.reports'),
      value: t('stories.page.reportCounts', {
        open: story.openReports,
        closed: story.closedReports,
      }),
    },
  ];
  return <LabelRows rows={rows} />;
}

/**
 * The story once it has loaded.
 *
 * @returns the details, the blurb and the chapters
 */
function StoryOverview({ story }: { story: StaffStoryOverview }) {
  const { t } = useTranslation('staff');
  const changer = useChangeStaffStory(story.id);
  const mayChange = story.canChange && story.deletedAt === null;
  return (
    <>
      <title>{t('stories.page.documentTitle', { title: story.title })}</title>
      <h1 className="m-0 font-heading text-[34px] font-bold text-heading">{story.title}</h1>
      {story.deletedAt !== null && <Notice tone="info">{t('stories.page.deletedByWriter')}</Notice>}
      {!story.canChange && <p className="m-0 text-body">{t('stories.page.viewOnly')}</p>}
      <div className="flex max-w-[760px] flex-col gap-6">
        <StoryDetails story={story} />
        {story.blurb !== '' && (
          <section aria-labelledby="story-blurb-heading" className="flex flex-col gap-2">
            <h2
              id="story-blurb-heading"
              className="m-0 font-heading text-[24px] font-bold text-heading"
            >
              {t('stories.page.blurbHeading')}
            </h2>
            <p className="m-0 text-body whitespace-pre-line">{story.blurb}</p>
          </section>
        )}
        {mayChange && (
          <>
            <StaffStoryVisibilityForm story={story} changer={changer} />
            <StaffStorySettingsForm
              key={JSON.stringify(story.settings)}
              story={story}
              changer={changer}
            />
          </>
        )}
        <StaffStoryChapters
          chapters={story.chapters}
          storyLanguage={story.languageCode}
          changer={mayChange ? changer : null}
        />
        <StaffStoryHistory history={story.history} changer={mayChange ? changer : null} />
      </div>
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the story's staff page
 */
export function StaffStoryPage() {
  const { t } = useTranslation('staff');
  const { storyId = '' } = useParams();
  const { story, isLoading, failure } = useStaffStory(storyId);
  return (
    <PageContainer className="flex flex-col gap-4 pt-12 pb-7">
      <Link to="/staff/stories" className="text-link underline">
        {t('stories.page.back')}
      </Link>
      <Eyebrow>{t('stories.eyebrow')}</Eyebrow>
      {failure === 'not_allowed' && <p className="m-0 text-body">{t('stories.notAllowed')}</p>}
      {failure === 'no_such_story' && (
        <p className="m-0 text-body">{t('stories.page.noSuchStory')}</p>
      )}
      {failure === 'unreachable' && <Notice tone="error">{t('stories.loadFailed')}</Notice>}
      {isLoading && failure === null && (
        <p role="status" className="m-0 text-meta">
          {t('stories.page.loading')}
        </p>
      )}
      {story !== null && <StoryOverview story={story} />}
    </PageContainer>
  );
}
