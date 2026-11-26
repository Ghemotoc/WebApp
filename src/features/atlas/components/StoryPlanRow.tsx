/**
 * StoryPlanRow: one story in the list on /plan (board E20; user stories bundle 6, story 6.1).
 *
 * A 56 px cover, then the title (a link to the story's plan, which opens on At a glance), a meta
 * line ("Drafting · Fiction · 31,640 of 40,000 words · edited 10 minutes ago") with the writer's
 * own writing status first in bold, and the logline under it. Rows are split by a hairline, as
 * the board's `.gh-rows` list draws them.
 * Who uses it: AtlasHomePage. What it calls: StoryCoverArt and DrawnCover for the cover, MetaLine,
 * lib/planRowFacts.ts for the words and the last fact, timeAgo for "edited …".
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { type MetaFact, MetaLine } from '@/components/ui/MetaLine';
import { timeAgo } from '@/features/comments/lib/timeAgo';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';
import type { MyStory } from '@/features/writing/api/stories';

import type { StoryPlanSummary } from '../api/storyPlanList';
import { atlasEntryAddress } from '../lib/atlasSections';
import { planProgressFact, planWordsFact } from '../lib/planRowFacts';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Puts the row's four facts into words.
 *
 * @returns the writing status (bold), the genre, the words and the last fact
 */
function useRowFacts(story: MyStory, plan: StoryPlanSummary): MetaFact[] {
  const { t, i18n } = useAtlasTranslation();
  const { t: tWriting } = useTranslation('writing');
  const numbers = new Intl.NumberFormat(i18n.language);
  // Step 1: "31,640 of 40,000 words", or "14,800 words" once finished.
  const words = planWordsFact(plan);
  const wordsText =
    words.kind === 'ofTarget'
      ? t('words.count', {
          written: numbers.format(words.written),
          target: numbers.format(words.target),
        })
      : t('home.wordsOnly', { count: words.written, formatted: numbers.format(words.written) });
  // Step 2: an edit today, the published parts, or "not published".
  const progress = planProgressFact(plan, story.categorySlug);
  let progressText: string;
  if (progress.kind === 'edited') {
    progressText = t('home.edited', { when: timeAgo(progress.editedAt, i18n.language) });
  } else if (progress.kind === 'notPublished') {
    progressText = t('home.notPublished');
  } else {
    progressText = t(`home.${progress.kind}`, { count: progress.count });
  }
  return [
    { text: t(`writingStatus.${plan.writingStatus}`), kind: 'state' },
    { text: tWriting(`categories.${story.categorySlug}`, { defaultValue: story.categorySlug }) },
    { text: wordsText },
    { text: progressText },
  ];
}

/**
 * Renders the row.
 *
 * @param props.story - the story, from the writer's own list (title, genre, cover)
 * @param props.plan - its plan's summary, from my_story_plans()
 * @param props.cover - the drawn cover to show when there is no uploaded one
 * @returns one list item
 */
export function StoryPlanRow({
  story,
  plan,
  cover,
}: {
  story: MyStory;
  plan: StoryPlanSummary;
  cover: DrawnCoverChoice;
}) {
  const facts = useRowFacts(story, plan);
  return (
    <li className="flex items-start gap-4 border-t border-hairline py-3">
      {/* The cover repeats the title beside it, so it is hidden from screen readers. */}
      <StoryCoverArt
        story={story}
        className="w-14 shrink-0"
        drawn={
          <DrawnCover
            title={story.title}
            choice={cover}
            size="tile"
            isDecorative
            className="w-14 shrink-0"
          />
        }
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          to={atlasEntryAddress(story.slug)}
          className="type-body font-semibold break-words text-ink-heading no-underline hover:underline"
        >
          {story.title}
        </Link>
        <MetaLine facts={facts} />
        {plan.logline !== '' && (
          <p className="m-0 type-body break-words text-ink-muted">{plan.logline}</p>
        )}
      </div>
    </li>
  );
}
