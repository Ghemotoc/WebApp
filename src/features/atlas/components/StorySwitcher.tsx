/**
 * StorySwitcher: the story picker in the Story Atlas top bar (story S1-E17-02: "it lists every
 * story I write (drafts and published) by title").
 *
 * The shared drop-down (DoD drop-down rule), listing the writer's live stories (deleted ones are
 * in Your writing's "Recently deleted"). Its label ("Story") is for screen readers only: the glass
 * top bar shows the story's title in the pill itself (bundle G10a, board AtlasStory). Picking a story opens its plan; nothing from the other
 * stories shows, because each page reads only its own story's plan.
 * Who uses it: AtlasTopBar. What it calls: useMyStories (the same list as Your writing).
 */
import { useNavigate } from 'react-router';

import { Select } from '@/components/ui/Select';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the switcher.
 *
 * @param props.currentSlug - the story open now
 * @returns the labelled drop-down, or nothing until the list has loaded
 */
export function StorySwitcher({ currentSlug }: { currentSlug: string }) {
  const { t } = useAtlasTranslation();
  const navigate = useNavigate();
  const { stories, isKnown } = useMyStories();
  const liveStories = stories.filter((story) => story.deletedAt === null);
  if (!isKnown || liveStories.length === 0) return null;
  return (
    <Select
      id="atlas-story-switcher"
      label={t('switcher.label')}
      options={liveStories.map((story) => ({ value: story.slug, label: story.title }))}
      value={currentSlug}
      onChange={(slug) => void navigate(`/plan/s/${slug}`)}
    />
  );
}
