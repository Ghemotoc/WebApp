/**
 * BibleEntryView: one bible entry on the bible page (story S1-E17-18: "when I open it, then it
 * shows in reading mode with clickable links and an Edit toggle"; "when I delete it, then a second
 * confirming click is needed").
 *
 * A glass article laid out as board AtlasWorld (bundle G10 ATLAS, part c1): the section and an
 * Edit toggle on the top row (aria-pressed, so its state is never told by colour alone), then the
 * title. Reading mode shows the tags, the text as Markdown and the links found in it; editing
 * mode shows BibleEntryEditor. A new entry opens in editing mode. Delete sits at the foot and asks twice.
 * Who uses it: BiblePage. What it calls: the save and remove props (useStoryBible).
 */
import { useState } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';

import type { BibleEntry, BibleEntryChange, StoryBible } from '../api/bible';
import { useBibleSectionName } from '../hooks/useBibleSectionName';
import { useOpenStorySlug } from '../hooks/useOpenStorySlug';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { BibleEntryEditor } from './BibleEntryEditor';
import { CrossLinkChips } from './CrossLinkChips';
import { ItemVisibilityControls } from './ItemVisibilityControls';
import { BibleMarkdown } from './BibleMarkdown';
import { TwoStepDelete } from './TwoStepDelete';

/** What the view needs. */
export interface BibleEntryViewProps {
  bible: StoryBible;
  entry: BibleEntry;
  /** True for an entry just made, which opens ready to write. */
  startsEditing: boolean;
  save: (change: BibleEntryChange) => Promise<void>;
  /** Deletes the entry, then the caller closes it; throws when it can't. */
  remove: () => Promise<void>;
}

/** Reading mode: the tags, the text and the links found in it. */
function EntryReading({ entry }: Pick<BibleEntryViewProps, 'entry'>) {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {entry.tags.length > 0 && (
        <ul aria-label={t('bible.entry.tags')} className="m-0 flex list-none flex-wrap gap-2 p-0">
          {entry.tags.map((tag) => (
            <li key={tag}>
              <InfoPill tone="plum">{tag}</InfoPill>
            </li>
          ))}
        </ul>
      )}
      {entry.body.trim() === '' ? (
        <p className="m-0 text-body">{t('bible.entry.empty')}</p>
      ) : (
        // Board AtlasWorld: the entry reads at 17 px on a line no wider than 700 px.
        <div className="max-w-[700px] [&>div]:text-[17px] [&>div]:leading-[1.7]">
          <BibleMarkdown text={entry.body} />
        </div>
      )}
      <CrossLinkChips texts={[entry.body]} />
    </div>
  );
}

/** The top row: which section the entry is in (reading mode only) and the Edit toggle. */
function EntryTopRow({
  bible,
  entry,
  isEditing,
  onToggle,
}: Pick<BibleEntryViewProps, 'bible' | 'entry'> & { isEditing: boolean; onToggle: () => void }) {
  const { t } = useAtlasTranslation();
  const sectionName = useBibleSectionName();
  const section = bible.sections.find((candidate) => candidate.id === entry.sectionId);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="m-0 text-sm text-meta">
        {isEditing && t('bible.entry.editing')}
        {!isEditing &&
          section !== undefined &&
          t('bible.entry.inSection', { section: sectionName(section) })}
      </p>
      <Button variant="secondary" aria-pressed={isEditing} onClick={onToggle}>
        <ActionIcon name="pen" size={16} />
        {t('bible.entry.edit')}
      </Button>
    </div>
  );
}

/** "What readers see" for the entry: Keep private and the chapter it waits for (S1-E17-32, 35). */
function EntryReadersSection({ entry }: { entry: BibleEntry }) {
  const { t } = useAtlasTranslation();
  const slug = useOpenStorySlug();
  return (
    <section
      aria-labelledby="atlas-bible-entry-readers-heading"
      className="flex flex-col gap-2 border-t border-hairline pt-4"
    >
      <h3
        id="atlas-bible-entry-readers-heading"
        className="m-0 font-heading text-lg font-bold text-heading"
      >
        {t('readers.item.heading')}
      </h3>
      <p className="m-0 text-sm text-body">{t('readers.item.entryHint')}</p>
      <ItemVisibilityControls slug={slug} itemId={entry.id} itemName={entry.title} allowsGuard />
    </section>
  );
}

/**
 * Renders the entry.
 *
 * @returns the article with its heading, toggle, reading or editing mode, and Delete
 */
export function BibleEntryView({ bible, entry, startsEditing, save, remove }: BibleEntryViewProps) {
  const { t } = useAtlasTranslation();
  const [isEditing, setIsEditing] = useState(startsEditing);
  return (
    <article
      aria-labelledby="atlas-bible-entry-heading"
      className="flex min-w-0 flex-col gap-4 rounded-card border border-border bg-surface px-5 py-6 shadow-card sm:px-11 sm:py-9"
    >
      <EntryTopRow
        bible={bible}
        entry={entry}
        isEditing={isEditing}
        onToggle={() => setIsEditing(!isEditing)}
      />
      <h2
        id="atlas-bible-entry-heading"
        className="m-0 min-w-0 font-heading text-[clamp(26px,3vw,36px)] leading-[1.1] font-extrabold break-words text-heading"
      >
        {entry.title}
      </h2>
      {isEditing ? (
        <BibleEntryEditor bible={bible} entry={entry} save={save} />
      ) : (
        <EntryReading entry={entry} />
      )}
      <EntryReadersSection entry={entry} />
      <section
        aria-labelledby="atlas-bible-entry-delete-heading"
        className="flex flex-col gap-2 border-t border-hairline pt-4"
      >
        <h3
          id="atlas-bible-entry-delete-heading"
          className="m-0 font-heading text-lg font-bold text-heading"
        >
          {t('bible.entry.delete.heading')}
        </h3>
        <TwoStepDelete
          buttonLabel={t('bible.entry.delete.button')}
          question={t('bible.entry.delete.confirm', { title: entry.title })}
          yesLabel={t('bible.entry.delete.yes')}
          keepLabel={t('bible.entry.delete.keep')}
          failedMessage={t('bible.entry.delete.failed')}
          onDelete={async () => {
            await remove();
            return null;
          }}
        />
      </section>
    </article>
  );
}
