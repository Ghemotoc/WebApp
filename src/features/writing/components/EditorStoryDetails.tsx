/**
 * EditorStoryDetails: "Story details" under the chapter's plan in the editor (board D05, user
 * story 5.5: "Story details" sits under More details, folded).
 *
 * A closed disclosure on the box surface; opened, one meta line with what applies to every
 * chapter, "Fiction · 13+ · No AI · Completed", then "Story settings", the one place these are
 * changed (D07). It is read-only here on purpose: ratings and labels have one place to be set
 * (docs/board-fixes.md). It replaces the Saving, Publish and Story details panels of the old
 * aside: the save now shows in the editor's bar and at the foot of the paper, and Publish opens
 * its panel from the bar.
 * Who uses it: ChapterEditorPage. What it calls: nothing; the story comes from useMyStories.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { MyStory } from '../api/stories';
import { useEditorTranslation } from '../registerEditorTranslations';

/**
 * Renders the disclosure.
 *
 * @param props.story - the writer's story, as useMyStories gives it
 * @returns the closed "Story details" box
 */
export function EditorStoryDetails({ story }: { story: MyStory }) {
  const { t } = useEditorTranslation();
  const { t: tWriting } = useTranslation('writing');
  // The facts, in the board's order: category, rating, the AI label and the story's state.
  const facts = [
    tWriting(`categories.${story.categorySlug}`, { defaultValue: story.categorySlug }),
    tWriting(`rating.${story.rating}`),
    tWriting(`aiDisclosure.${story.aiDisclosure}`),
    t(`details.completion.${story.completionStatus}`),
  ];
  return (
    <details className="box-surface rounded-card px-6 py-2">
      <summary className="flex min-h-11 cursor-pointer items-center type-label font-semibold text-ink-heading">
        {t('details.heading')}
      </summary>
      <p className="m-0 pb-4 type-meta text-ink-muted">
        {facts.join(' · ')}
        {' · '}
        <Link to={`/write/s/${story.slug}/settings`} className="inline-block min-h-6 font-semibold">
          {t('details.settings')}
        </Link>
      </p>
    </details>
  );
}
