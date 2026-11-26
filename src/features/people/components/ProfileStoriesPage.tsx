/**
 * ProfileStoriesPage: every story a writer published, from "See every story" on their profile and
 * "More by" at the end of a story (board C05, bundle 3 of "Build: the full design as user
 * stories"; Robert, 25 Nov 2026, 09:50 UTC: no widget missing between the canvas and the live
 * site).
 *
 * Who shows it: the router, at /u/:handle/stories.
 * What it shows: the profile's header (ProfileHeader, the same card as the profile), then
 * "Stories by <name>" with Ongoing, Completed and Both (Both first, kept in ?status= so a shared
 * link or the Back button keeps the choice), then one ProfileStoryRow per story, 20 at a time with
 * "Show 20 more". Follow story shows only for someone signed in who isn't the writer, as on the
 * profile. When the profile can't be shown the page says "This profile isn't available".
 * What it calls: useWriterProfile → get_writer_profile(), and useStoryList → browse_stories() with
 * the 'writer' list, which already leaves out what this reader may not see (rating, blocks,
 * moderation) and filters by status in the database.
 */
import { useParams, useSearchParams } from 'react-router';

import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useSession } from '@/features/auth/hooks/useSession';
import {
  everyLanguage,
  type CompletionStatus,
  type ListRequest,
} from '@/features/discovery/api/storyLists';
import { storiesPerPage, useStoryList } from '@/features/discovery/hooks/useStoryList';

import type { WriterProfile } from '../api/writerProfile';
import { useWriterProfile } from '../hooks/useWriterProfile';
import { usePeopleTranslation } from '../registerPeopleTranslations';

import { ProfileHeader } from './ProfileHeader';
import { ProfileStoryRow } from './ProfileStoryRow';
import { ProfileUnavailable } from './ProfileUnavailable';

/** The three choices the board draws, in its order. */
const statusChoices = ['ongoing', 'completed', 'both'] as const;

/** One of the choices. */
type StatusChoice = (typeof statusChoices)[number];

/**
 * Reads the choice from the address; anything else is Both, the board's default.
 *
 * @param value - ?status= as typed
 * @returns the choice
 */
function statusChoiceFrom(value: string | null): StatusChoice {
  if (value === 'ongoing' || value === 'completed') return value;
  return 'both';
}

/**
 * The status the database filters by: none for Both.
 *
 * @param choice - the reader's choice
 * @returns ongoing, completed or null
 */
function completionFor(choice: StatusChoice): CompletionStatus | null {
  if (choice === 'both') return null;
  return choice;
}

/** The choice, kept in ?status= (Both leaves the address clean). */
function useStatusChoice() {
  const [searchParams, setSearchParams] = useSearchParams();
  const choice = statusChoiceFrom(searchParams.get('status'));
  const choose = (next: StatusChoice) => {
    // Replace, not push: switching tabs shouldn't fill the Back button's history.
    setSearchParams(next === 'both' ? {} : { status: next }, { replace: true });
  };
  return { choice, choose };
}

/** What the rows need. */
interface WriterStoryRowsProps {
  profile: WriterProfile;
  choice: StatusChoice;
}

/** The line shown when a tab holds no story. */
function NoStoriesLine({ profile, choice }: WriterStoryRowsProps) {
  const { t } = usePeopleTranslation();
  const key = {
    ongoing: 'stories.noneOngoing',
    completed: 'stories.noneCompleted',
    both: 'profile.noStoriesBody',
  } as const;
  return (
    <p className="m-0 py-4 type-body text-ink-muted">
      {t(key[choice], { name: profile.displayName })}
    </p>
  );
}

/**
 * The writer's stories for one tab, 20 at a time.
 *
 * @returns the rows and "Show 20 more", a wait, a line when there is none, or an error
 */
function WriterStoryRows({ profile, choice }: WriterStoryRowsProps) {
  const { t } = usePeopleTranslation();
  const { userId } = useSession();
  // Step 1: the 'writer' list, every language (the reader came for this writer), the status
  // filtered in the database so "Show 20 more" pages through the tab, not through every story.
  const request: ListRequest = {
    kind: 'writer',
    key: profile.handle,
    categorySlug: null,
    completion: completionFor(choice),
    languageCode: everyLanguage,
    sortOrder: null,
  };
  const list = useStoryList(request);
  if (list.loadFailed) return <Notice tone="error">{t('stories.loadFailed')}</Notice>;
  if (!list.isLoaded) return null;
  if (list.stories.length === 0) return <NoStoriesLine profile={profile} choice={choice} />;
  // Step 2: covers worked out together so neighbours never share a design (S1-E3-13).
  const covers = designsForRow(list.stories);
  return (
    <div className="flex flex-col items-center gap-6">
      <ul className="m-0 w-full list-none p-0">
        {list.stories.map((story, index) => (
          <ProfileStoryRow
            key={story.slug}
            story={story}
            cover={covers[index] ?? resolveCoverChoice(story)}
            // As on the profile: a visitor has one "Get in to follow" beside the name already.
            showsFollow={userId !== null && !profile.isMe}
          />
        ))}
      </ul>
      {list.hasMore && (
        <Button variant="secondary" disabled={list.isLoadingMore} onClick={list.loadMore}>
          {list.isLoadingMore
            ? t('stories.loadingMore')
            : t('stories.loadMore', { count: storiesPerPage })}
        </Button>
      )}
    </div>
  );
}

/** "Stories by <name>", the three tabs and the rows. */
function WriterStories({ profile }: { profile: WriterProfile }) {
  const { t } = usePeopleTranslation();
  const { choice, choose } = useStatusChoice();
  const options = statusChoices.map((value) => ({ value, label: t(`stories.${value}`) }));
  return (
    <section aria-labelledby="writer-stories-heading" className="flex min-w-0 flex-col gap-4">
      <h2 id="writer-stories-heading" className="m-0 type-heading">
        {t('profile.storiesHeading', { name: profile.displayName })}
      </h2>
      <SegmentedControl
        legend={t('stories.statusLegend')}
        isLegendVisible={false}
        name="writer-stories-status"
        options={options}
        value={choice}
        onChange={choose}
      />
      <WriterStoryRows profile={profile} choice={choice} />
    </section>
  );
}

/**
 * Renders the page.
 *
 * @returns the header and the stories, a wait, or "not available"
 */
export function ProfileStoriesPage() {
  const { t } = usePeopleTranslation();
  const { handle = '' } = useParams();
  const { profile, isLoaded, loadFailed } = useWriterProfile(handle);
  if (loadFailed) {
    return (
      <PageContainer className="pt-12 pb-6">
        <Notice tone="error">{t('profile.loadFailed')}</Notice>
      </PageContainer>
    );
  }
  if (!isLoaded) return null;
  if (profile === null) {
    return (
      <PageContainer className="tmc-rise pt-12 pb-6">
        <ProfileUnavailable />
      </PageContainer>
    );
  }
  return (
    <PageContainer className="tmc-rise flex flex-col gap-12 pt-8 pb-6">
      <title>{t('stories.documentTitle', { name: profile.displayName })}</title>
      <ProfileHeader profile={profile} />
      {!profile.iBlocked && <WriterStories profile={profile} />}
    </PageContainer>
  );
}
