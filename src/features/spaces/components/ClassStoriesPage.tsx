/**
 * ClassStoriesPage: every story shared with one class (bundle CLASSES, part c; story S1-E8-11;
 * bundle BOOKS-8, board G04-ClassStories, user story 8.4).
 *
 * Who shows it: the router, at /spaces/:spaceSlug/stories; the class page's "Open the stories"
 * and its "Stories" tab lead here.
 * What it shows (board G04): the breadcrumb, the title, "Class only · 6 stories", the line on who
 * can read them, "Share a story" for a member who may post, the Class and Stories tabs, then every
 * story as a row; a writer's own story has "Make public" at its end. Under the list, the line that
 * class spaces never show advertising (story S1-E12-04: no ads in class spaces).
 * What it calls: useSpace() for the class, useClassSpaceStories() → class_space_stories() (an
 * empty list to anyone who may not read the class), useMyNames() for whose stories are whose,
 * ShareClassStory, ClassSectionTabs, ClassStoryRow and ClassStoryMakePublic.
 */
import { useParams } from 'react-router';

import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { MetaLine } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useMyNames } from '@/features/account/hooks/useMyNames';
import type { ListedStory } from '@/features/discovery/api/storyLists';

import { useClassSpaceStories } from '../hooks/useClassStories';
import { useSpace } from '../hooks/useSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { ClassSectionTabs } from './ClassSectionTabs';
import { ClassStoryMakePublic } from './ClassStoryMakePublic';
import { ClassStoryRow } from './ClassStoryRow';
import { ShareClassStory } from './ShareClassStory';
import { SpaceBreadcrumb } from './SpaceBreadcrumb';

/**
 * Every shared story as a row, with "Make public" on the viewer's own.
 *
 * @param props.stories - the stories shared with the class
 * @returns the list
 */
function StoryRows({ stories }: { stories: ListedStory[] }) {
  const { t } = useSpacesTranslation();
  const { names } = useMyNames();
  const covers = designsForRow(stories);
  const myHandle = names?.handle ?? null;
  return (
    <ul className="m-0 flex list-none flex-col p-0" aria-label={t('classStories.title')}>
      {stories.map((story, index) => (
        <ClassStoryRow
          key={story.slug}
          story={story}
          cover={covers[index] ?? resolveCoverChoice(story)}
          action={
            story.writer.handle === myHandle ? (
              <ClassStoryMakePublic storySlug={story.slug} storyTitle={story.title} />
            ) : undefined
          }
        />
      ))}
    </ul>
  );
}

/**
 * The page's header: title, "Class only · N stories", who can read them and "Share a story".
 *
 * @param props.slug - the class's address
 * @param props.name - the class's name
 * @param props.count - how many stories are shared
 * @param props.canShare - whether the viewer may share a story here
 * @returns the header
 */
function StoriesHeader({
  slug,
  name,
  count,
  canShare,
}: {
  slug: string;
  name: string;
  count: number;
  canShare: boolean;
}) {
  const { t } = useSpacesTranslation();
  return (
    <header className="flex flex-col items-start gap-2">
      <h1 className="page-title m-0 break-words">{t('classStories.title')}</h1>
      <MetaLine
        facts={[
          { text: t('classPage.classOnly'), kind: 'state' },
          { text: t('classStories.count', { count }) },
        ]}
      />
      <p className="m-0 max-w-[34em] type-body text-ink-muted">
        {t('classStories.note', { name })}
      </p>
      {canShare && (
        <div className="pt-4">
          <ShareClassStory classSlug={slug} />
        </div>
      )}
    </header>
  );
}

/**
 * The list under the tabs: a load error, the empty line or every story.
 *
 * @param props.slug - the class's address
 * @returns the body
 */
function StoriesBody({ slug }: { slug: string }) {
  const { t } = useSpacesTranslation();
  const read = useClassSpaceStories(slug);
  const stories = read.data ?? [];
  if (read.isError) return <Notice tone="error">{t('classStories.loadFailed')}</Notice>;
  if (!read.isSuccess) return null;
  if (stories.length === 0) {
    return <p className="m-0 type-body text-ink-muted">{t('classStories.empty')}</p>;
  }
  return <StoryRows stories={stories} />;
}

/**
 * Renders the page.
 *
 * @returns the class's stories with the way to share one
 */
export function ClassStoriesPage() {
  const { t } = useSpacesTranslation();
  const { spaceSlug = '' } = useParams();
  const space = useSpace(spaceSlug);
  const count = useClassSpaceStories(spaceSlug).data?.length ?? 0;
  const name = space.data?.name ?? '';
  // Step 1: only a member who may post in a class that isn't locked shares a story (as G03).
  const canShare = space.data?.viewer.canPost === true && space.data.isLocked !== true;
  return (
    <PageContainer className="flex flex-col gap-12 py-8">
      <title>{t('classStories.documentTitle', { name })}</title>
      <SpaceBreadcrumb space={{ slug: spaceSlug, name }} current={t('classStories.crumb')} />
      <StoriesHeader slug={spaceSlug} name={name} count={count} canShare={canShare} />
      <ClassSectionTabs slug={spaceSlug} />
      <StoriesBody slug={spaceSlug} />
      <p className="m-0 max-w-none type-meta text-ink-muted">{t('classStories.noAds')}</p>
    </PageContainer>
  );
}
