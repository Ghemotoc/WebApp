/**
 * BibleEntryView: one story world entry (stories S1-E17-18; redrawn by user stories bundle 6,
 * story 6.8, board E27: "An entry reads like a page").
 *
 * No card: the entry is the page. The top row holds "In World and places" (or, while editing,
 * "Editing: changes save by themselves.") above the title on the left, and Edit (aria-pressed, so
 * its state is never told by colour alone) with the "…" More menu on the right. Reading mode shows
 * the tags as one meta line ("#place · #underground"), the text in Literata and the [[links]] as
 * one "Links:" line; editing mode shows BibleEntryEditor. A new entry opens in editing mode.
 * "What readers see" follows, and More holds Delete entry, which asks once.
 * Who uses it: BiblePage. What it calls: the save and remove props (useStoryBible), CrossLinkLine,
 * EntryMoreMenu and ItemVisibilityControls.
 */
import { useState } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';

import type { BibleEntry, BibleEntryChange, StoryBible } from '../api/bible';
import { useBibleSectionName } from '../hooks/useBibleSectionName';
import { useOpenStorySlug } from '../hooks/useOpenStorySlug';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { BibleEntryEditor } from './BibleEntryEditor';
import { BibleMarkdown } from './BibleMarkdown';
import { CrossLinkLine } from './CrossLinkLine';
import { EntryMoreMenu } from './EntryMoreMenu';
import { ItemVisibilityControls } from './ItemVisibilityControls';

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

/** Reading mode: the tags line, the text and the links found in it. */
function EntryReading({ entry }: Pick<BibleEntryViewProps, 'entry'>) {
  const { t } = useAtlasTranslation();
  // Board E27: the tags are one meta line, each with a "#", joined by middots (no pills).
  const tagsLine = entry.tags.map((tag) => `#${tag}`).join(' · ');
  return (
    <>
      {entry.tags.length > 0 && (
        <p className="m-0 type-meta text-ink-muted">
          <span className="sr-only">{t('bible.entry.tags')}: </span>
          {tagsLine}
        </p>
      )}
      {entry.body.trim() === '' ? (
        <p className="m-0 type-body text-ink-muted">{t('bible.entry.empty')}</p>
      ) : (
        // Board E27: the entry reads in Literata at 17/28, like a page of the story.
        <BibleMarkdown text={entry.body} readsLikePage />
      )}
      <CrossLinkLine text={entry.body} />
    </>
  );
}

/** The top row: the section (or the editing note) over the title, then Edit and More. */
function EntryTopRow({
  bible,
  entry,
  isEditing,
  onToggle,
  remove,
}: Pick<BibleEntryViewProps, 'bible' | 'entry' | 'remove'> & {
  isEditing: boolean;
  onToggle: () => void;
}) {
  const { t } = useAtlasTranslation();
  const sectionName = useBibleSectionName();
  const section = bible.sections.find((candidate) => candidate.id === entry.sectionId);
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="m-0 type-meta text-ink-muted">
          {isEditing && t('bible.entry.editing')}
          {!isEditing &&
            section !== undefined &&
            t('bible.entry.inSection', { section: sectionName(section) })}
        </p>
        <h2
          id="atlas-bible-entry-heading"
          className="m-0 min-w-0 font-heading type-title font-bold break-words text-ink-heading"
        >
          {entry.title}
        </h2>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Button variant="secondary" aria-pressed={isEditing} onClick={onToggle}>
          <ActionIcon name="pen" size={16} />
          {t('bible.entry.edit')}
        </Button>
        <EntryMoreMenu title={entry.title} remove={remove} />
      </div>
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
        className="m-0 type-label font-semibold text-ink-heading"
      >
        {t('readers.item.heading')}
      </h3>
      <p className="m-0 type-body text-ink">{t('readers.item.entryHint')}</p>
      <ItemVisibilityControls slug={slug} itemId={entry.id} itemName={entry.title} allowsGuard />
    </section>
  );
}

/**
 * Renders the entry.
 *
 * @returns the article with its top row, reading or editing mode, and What readers see
 */
export function BibleEntryView({ bible, entry, startsEditing, save, remove }: BibleEntryViewProps) {
  const [isEditing, setIsEditing] = useState(startsEditing);
  return (
    <article aria-labelledby="atlas-bible-entry-heading" className="flex min-w-0 flex-col gap-4">
      <EntryTopRow
        bible={bible}
        entry={entry}
        isEditing={isEditing}
        onToggle={() => setIsEditing(!isEditing)}
        remove={remove}
      />
      {isEditing ? (
        <BibleEntryEditor bible={bible} entry={entry} save={save} />
      ) : (
        <EntryReading entry={entry} />
      )}
      <EntryReadersSection entry={entry} />
    </article>
  );
}
