/**
 * ProfileStories: "Stories by <name>", the writer's published stories as one scrolling shelf
 * (story S1-E5-05; board 6.1; CLAUDE.md rule 20: a shelf is one line of at most 20, then a
 * "View more" card).
 *
 * Each story is the shared StoryCard (drawn or automatic cover, title, "n chapters" line), the
 * same card Discover uses, rather than the board's wide card with buttons: one card everywhere,
 * and the shelf rules (fade, arrows, View more) come for free. The "View more" card points at
 * the writer's See all address, which S1-E5-09 builds. The database already left out what this
 * reader may not see (rating, blocks, moderation).
 * Who uses it: WriterProfilePage.
 */
import { usePeopleTranslation } from '../registerPeopleTranslations';

import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { EmptyState } from '@/components/ui/EmptyState';
import { InfoPill } from '@/components/ui/InfoPill';
import { Shelf } from '@/components/ui/Shelf';
import { StoryCard } from '@/components/ui/StoryCard';

import type { WriterProfile } from '../api/writerProfile';

/**
 * Renders the shelf, or the empty state when nothing is published.
 *
 * @returns the section
 */
export function ProfileStories({ profile }: { profile: WriterProfile }) {
  const { t } = usePeopleTranslation();
  if (profile.stories.length === 0) {
    const description = profile.isMe
      ? t('profile.noStoriesMine')
      : t('profile.noStoriesBody', { name: profile.displayName });
    return <EmptyState title={t('profile.noStoriesTitle')} description={description} />;
  }
  const covers = designsForRow(profile.stories);
  return (
    <Shelf
      eyebrow={t('profile.storiesEyebrow')}
      title={t('profile.storiesHeading', { name: profile.displayName })}
      seeAllHref={`/u/${encodeURIComponent(profile.handle)}/stories`}
      items={profile.stories.map((story, index) => ({
        key: story.slug,
        content: (
          <StoryCard
            title={story.title}
            metaLine={t('profile.storyMeta', { count: story.chapterCount })}
            cover={covers[index] ?? resolveCoverChoice(story)}
            href={`/s/${story.slug}`}
            pill={
              <InfoPill tone={story.completionStatus === 'completed' ? 'gold' : 'sage'}>
                {t(`status.${story.completionStatus}`, { ns: 'writing' })}
              </InfoPill>
            }
          />
        ),
      }))}
    />
  );
}
