/**
 * ClassStoriesPage: every story shared with one class, the See all page of the class page's
 * "Stories shared with the class" shelf (bundle CLASSES, part c; story S1-E8-11; CLAUDE.md
 * rule 20: a shelf's "View more" opens a page that lists all of them).
 *
 * Who shows it: the router, at /spaces/:spaceSlug/stories.
 * What it calls: useSpace() for the class's name and useClassSpaceStories() →
 * class_space_stories(), which answers an empty list to anyone who may not read the class.
 */
import { useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { StoryGrid } from '@/features/discovery/components/StoryGrid';

import { useClassSpaceStories } from '../hooks/useClassStories';
import { useSpace } from '../hooks/useSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceBreadcrumb } from './SpaceBreadcrumb';

/** Every shared story is on the page at once, so "Load more" never shows and does nothing. */
function doNothing() {
  return undefined;
}

/**
 * Renders the page.
 *
 * @returns the class's name, then every story shared with it
 */
export function ClassStoriesPage() {
  const { t } = useSpacesTranslation();
  const { spaceSlug = '' } = useParams();
  const space = useSpace(spaceSlug);
  const read = useClassSpaceStories(spaceSlug);
  const stories = read.data ?? [];
  const name = space.data?.name ?? '';
  return (
    <PageContainer className="flex flex-col gap-6 py-10">
      <title>{t('classStories.documentTitle', { name })}</title>
      <SpaceBreadcrumb space={{ slug: spaceSlug, name }} current={t('classStories.title')} />
      <header className="flex flex-col gap-2">
        <Eyebrow>{name}</Eyebrow>
        <h1 className="m-0 font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-extrabold text-heading">
          {t('classStories.title')}
        </h1>
        <p className="m-0 text-body">{t('classStories.note', { name })}</p>
      </header>
      {read.isError && <Notice tone="error">{t('classStories.loadFailed')}</Notice>}
      {read.isSuccess && stories.length === 0 && (
        <p className="m-0 text-body">{t('classStories.empty')}</p>
      )}
      {stories.length > 0 && (
        <StoryGrid stories={stories} hasMore={false} isLoadingMore={false} onLoadMore={doNothing} />
      )}
    </PageContainer>
  );
}
