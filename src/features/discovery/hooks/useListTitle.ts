/**
 * useListTitle: the eyebrow and title of a story list page (story S1-E5-09; board 3.10).
 *
 * Who calls it: StoryListPage and StoryListHeader. A category page is named after its category
 * (unknown until the categories load, and "no such list" for a slug that isn't one); a writer's
 * list uses the writer's display name from the first card, or the username before it loads.
 */
import { useStoryFormOptions } from '@/features/writing/hooks/useStoryFormOptions';

import type { ListedStory, ListRequest } from '../api/storyLists';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/** The words above the list. */
export interface ListTitle {
  eyebrow: string;
  title: string;
  /** True for a category slug that isn't a category. */
  isUnknown: boolean;
}

/**
 * Works out the eyebrow and title.
 *
 * @param request - the list
 * @param stories - the stories loaded so far (for the writer's name)
 * @returns the eyebrow, the title and whether the list exists
 */
export function useListTitle(request: ListRequest, stories: ListedStory[]): ListTitle {
  const { t } = useDiscoveryTranslation();
  const { categories, isLoaded } = useStoryFormOptions();
  const key = request.key ?? '';
  switch (request.kind) {
    case 'category': {
      // Step 1: a category page needs a real category; until the list loads, the slug's name.
      const isKnown = categories.some((category) => category.slug === key);
      return {
        eyebrow: t('lists.categoryEyebrow'),
        title: isKnown ? t(`categories.${key}`, { ns: 'writing' }) : '',
        isUnknown: isLoaded && !isKnown,
      };
    }
    case 'tag':
      return {
        eyebrow: t('lists.tagEyebrow'),
        title: t('lists.tag', { tag: key }),
        isUnknown: false,
      };
    case 'writer': {
      // Step 2: the writer's name comes with their stories; the username stands in before that.
      const name = stories[0]?.writer.displayName ?? `@${key}`;
      return {
        eyebrow: t('lists.writerEyebrow'),
        title: t('lists.writer', { name }),
        isUnknown: false,
      };
    }
    default:
      return {
        eyebrow: t(`lists.${request.kind}Eyebrow`),
        title: t(`lists.${request.kind}`),
        isUnknown: false,
      };
  }
}
