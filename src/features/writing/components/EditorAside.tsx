/**
 * EditorAside: the panels beside the chapter text (story S1-E3-02a; board 4.3's right column).
 *
 * Board values, top to bottom: "Saving" (the status box and "We save every 10 seconds…"),
 * "Publish" (the controls are PublishPanel, S1-E3-03), "Story details" (category, rating, tags, with
 * "Change in story settings": a read-only summary, because ratings and labels have one place
 * to be set, docs/board-fixes.md) and "Your stories" (each story opens its latest chapter, or its
 * settings while it has none). No doodles since bundle G4.
 * Who uses it: ChapterEditorPage.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { LabelRows } from '@/components/ui/LabelRows';
import { useTagCatalogue } from '@/features/tags/hooks/useTagCatalogue';

import type { MyStory } from '../api/stories';
import type { SaveState } from '../hooks/useAutosave';

import { storyEditorAddress } from '../lib/storyEditorAddress';

import { SaveStatus } from './SaveStatus';
import { useEditorTranslation } from '../registerEditorTranslations';

/** One white panel of the aside, a named region so a screen reader can jump to it. */
function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section
      aria-label={label}
      className="relative flex flex-col gap-3.5 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      {children}
    </section>
  );
}

/** "Story details": the labels that apply to every chapter, read-only here. */
function StoryDetailsPanel({ story }: { story: MyStory }) {
  const { t } = useEditorTranslation();
  const { t: tWriting } = useTranslation('writing');
  const { showTag } = useTagCatalogue();
  return (
    <Panel label={t('details.heading')}>
      <div className="flex w-fit flex-col gap-1">
        <Eyebrow>{t('details.heading')}</Eyebrow>
        <p className="m-0 text-[13px] text-meta">{t('details.intro')}</p>
      </div>
      <LabelRows
        rows={[
          {
            label: t('details.category'),
            value: tWriting(`categories.${story.categorySlug}`, {
              defaultValue: story.categorySlug,
            }),
          },
          { label: t('details.rating'), value: tWriting(`rating.${story.rating}`) },
          {
            label: t('details.tags'),
            value:
              story.tags.length === 0 ? t('details.noTags') : story.tags.map(showTag).join(' · '),
          },
        ]}
      />
      {/* self-start keeps the link's box to its words, so the space beside it isn't a link. */}
      <Link
        to={`/write/s/${story.slug}/settings`}
        className="inline-flex min-h-11 items-center self-start text-sm font-semibold"
      >
        {t('details.change')}
      </Link>
      {/* Story Atlas, the story's planning side (S1-E17-01: "Plan this story" beside the usual next step). */}
      <Link
        to={`/plan/s/${story.slug}`}
        className="inline-flex min-h-11 items-center self-start text-sm font-semibold"
      >
        {t('details.plan')}
      </Link>
    </Panel>
  );
}

/** "Your stories": the writer's live stories, the open one marked. */
function YourStoriesPanel({ stories, currentSlug }: { stories: MyStory[]; currentSlug: string }) {
  const { t } = useEditorTranslation();
  return (
    <Panel label={t('yourStories.heading')}>
      <div className="w-fit">
        <Eyebrow>{t('yourStories.heading')}</Eyebrow>
      </div>
      <ul className="m-0 flex list-none flex-col p-0">
        {stories.map((story) => (
          <li key={story.id} className="border-t border-border first:border-t-0">
            <Link
              to={storyEditorAddress(story)}
              aria-current={story.slug === currentSlug ? 'page' : undefined}
              className={`flex min-h-11 items-center py-2 text-sm no-underline hover:underline ${
                story.slug === currentSlug ? 'font-bold text-heading' : 'font-semibold text-body'
              }`}
            >
              {story.title}
            </Link>
          </li>
        ))}
      </ul>
      <Link
        to="/write/new"
        className="inline-flex min-h-11 items-center self-start text-sm font-semibold"
      >
        {t('yourStories.newStory')}
      </Link>
    </Panel>
  );
}

/** "Keep this version" and "Compare versions", under the status after a conflict (S1-E3-02b). */
function ConflictActions({
  onKeepMine,
  onCompare,
}: {
  onKeepMine: () => void;
  onCompare: () => void;
}) {
  const { t } = useEditorTranslation();
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onKeepMine}>{t('conflict.keepMine')}</Button>
      <Button variant="secondary" onClick={onCompare}>
        {t('conflict.compare')}
      </Button>
    </div>
  );
}

/** What the aside needs. */
export interface EditorAsideProps {
  saveState: SaveState;
  /** The Publish panel's controls (S1-E3-03). */
  publishControls: React.ReactNode;
  /** The two ways out of a conflict (S1-E3-02b). */
  onKeepMine: () => void;
  onCompare: () => void;
  story: MyStory | null;
  stories: MyStory[];
  currentSlug: string;
}

/**
 * Renders the aside.
 *
 * @returns the column of panels
 */
export function EditorAside(props: EditorAsideProps) {
  const { saveState, story, stories, currentSlug } = props;
  const { t } = useEditorTranslation();
  return (
    <aside className="flex flex-col gap-5">
      <Panel label={t('saving.heading')}>
        <div className="w-fit">
          <Eyebrow>{t('saving.heading')}</Eyebrow>
        </div>
        <SaveStatus state={saveState} />
        {saveState.kind === 'conflict' && (
          <ConflictActions onKeepMine={props.onKeepMine} onCompare={props.onCompare} />
        )}
        <p className="m-0 text-[13px] leading-normal text-meta">{t('saving.explain')}</p>
      </Panel>
      <Panel label={t('publish.heading')}>
        <div className="w-fit">
          <Eyebrow>{t('publish.heading')}</Eyebrow>
        </div>
        {/* The controls (PublishPanel, S1-E3-03) come from the page, which owns their state. */}
        {props.publishControls}
      </Panel>
      {story !== null && <StoryDetailsPanel story={story} />}
      {stories.length > 0 && <YourStoriesPanel stories={stories} currentSlug={currentSlug} />}
    </aside>
  );
}
