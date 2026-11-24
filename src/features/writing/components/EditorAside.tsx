/**
 * EditorAside: the panels beside the chapter text (story S1-E3-02a; board 4.3's right column).
 *
 * Board values, top to bottom: "Saving" (the status box and "We save every 10 seconds…"),
 * "Publish" (the controls are PublishPanel, S1-E3-03), "Story details" (category, rating, tags, with
 * "Change in story settings": a read-only summary, because ratings and labels have one place
 * to be set, docs/board-fixes.md). "Your stories" left the side in CALM-9 (board D05): the Write
 * page lists them. No doodles since bundle G4.
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

import { SaveStatus } from './SaveStatus';
import { useEditorTranslation } from '../registerEditorTranslations';

/** One white panel of the aside, a named region so a screen reader can jump to it. */
function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section
      aria-label={label}
      className="relative flex flex-col gap-4 rounded-card border border-border bg-surface p-4 shadow-card"
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
        <p className="m-0 type-meta text-ink-muted">{t('details.intro')}</p>
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
        className="inline-flex min-h-11 items-center self-start type-body font-semibold"
      >
        {t('details.change')}
      </Link>
      {/* Story Atlas, the story's planning side (S1-E17-01: "Plan this story" beside the usual next step). */}
      <Link
        to={`/plan/s/${story.slug}`}
        className="inline-flex min-h-11 items-center self-start type-body font-semibold"
      >
        {t('details.plan')}
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
  /** Saves again at once after "Could not save" (design books item 13). */
  onRetry: () => void;
  story: MyStory | null;
}

/**
 * Renders the aside.
 *
 * @returns the column of panels
 */
export function EditorAside(props: EditorAsideProps) {
  const { saveState, story } = props;
  const { t } = useEditorTranslation();
  return (
    <aside className="flex flex-col gap-4">
      <Panel label={t('saving.heading')}>
        <div className="w-fit">
          <Eyebrow>{t('saving.heading')}</Eyebrow>
        </div>
        <SaveStatus state={saveState} />
        {saveState.kind === 'failed' && (
          <Button variant="secondary" className="self-start" onClick={props.onRetry}>
            {t('saving.retry')}
          </Button>
        )}
        {saveState.kind === 'conflict' && (
          <ConflictActions onKeepMine={props.onKeepMine} onCompare={props.onCompare} />
        )}
        <p className="m-0 type-meta leading-normal text-ink-muted">{t('saving.explain')}</p>
      </Panel>
      <Panel label={t('publish.heading')}>
        <div className="w-fit">
          <Eyebrow>{t('publish.heading')}</Eyebrow>
        </div>
        {/* The controls (PublishPanel, S1-E3-03) come from the page, which owns their state. */}
        {props.publishControls}
      </Panel>
      {story !== null && <StoryDetailsPanel story={story} />}
    </aside>
  );
}
