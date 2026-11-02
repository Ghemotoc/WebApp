/**
 * StaffStoryCover: a story's cover on its staff page (bundle ADMIN-2, part b3; story S1-E11-08
 * criterion 1, "staff see its cover"; board AdminStory 8.11).
 *
 * Staff always see the real cover, even one they hid from readers, with a pill saying so: the
 * database answers staff with the writer's own cover and uploaded picture (story_as_shown() and
 * story_cover_picture()). A drawn or automatic cover is drawn here; an uploaded one is the picture,
 * through the same StoryCoverArt readers get. The cover is decorative: the title is the page's
 * heading right above it.
 * Who shows it: StaffStoryPage. What it calls: StoryCoverArt (useStoryCoverPicture) and DrawnCover.
 */
import { useTranslation } from 'react-i18next';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { InfoPill } from '@/components/ui/InfoPill';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

import type { StaffStoryOverview } from '../../api/staffStories';

/**
 * Renders the cover and, while hidden, the pill.
 *
 * @param props.story - the story's overview
 * @returns the cover
 */
export function StaffStoryCover({ story }: { story: StaffStoryOverview }) {
  const { t } = useTranslation('staff');
  const source = { id: story.id, ...story.cover };
  return (
    <div className="flex flex-col items-start gap-2">
      <StoryCoverArt
        story={{ slug: story.slug, coverKind: story.cover.coverKind }}
        className="w-[160px]"
        drawn={
          <DrawnCover
            title={story.title}
            choice={resolveCoverChoice(source)}
            size="preview"
            isDecorative
            className="w-[160px]"
          />
        }
      />
      {story.coverHidden && (
        <InfoPill tone="blush">{t('stories.presentation.coverHiddenPill')}</InfoPill>
      )}
    </div>
  );
}
