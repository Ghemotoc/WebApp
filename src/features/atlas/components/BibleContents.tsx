/**
 * BibleContents: the left side of the story world page, every section with its entries (stories
 * S1-E17-17 and S1-E17-18; redrawn by user stories bundle 6, story 6.8, board E27).
 *
 * A nav named "Sections of the story world". Each section is a label in sentence case with a "+"
 * button ("New entry in <section>", which makes one there and opens it for editing), then a quiet
 * list of its entries, or "No entries yet.". The open entry carries aria-current, the tint and
 * semibold type, not colour alone. "Manage sections" is a text button at the foot.
 * Who uses it: BiblePage. What it calls: the onCreateEntry prop (useStoryBible's createEntry).
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { Notice } from '@/components/ui/Notice';
import { cn } from '@/lib/utils';

import type { BibleSection, StoryBible } from '../api/bible';
import { useBibleSectionName } from '../hooks/useBibleSectionName';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the contents need. */
export interface BibleContentsProps {
  slug: string;
  bible: StoryBible;
  openEntryId: string | undefined;
  /** Makes an entry in a section and opens it; throws when it can't. */
  onCreateEntry: (sectionId: string) => Promise<void>;
}

/** One entry's row: a quiet link; the open one sits on the tint, in semibold. */
function EntryRow({ to, title, isOpen }: { to: string; title: string; isOpen: boolean }) {
  return (
    <li>
      <Link
        to={to}
        aria-current={isOpen ? 'page' : undefined}
        className={cn(
          'flex min-h-11 items-center rounded-field px-3 py-2 type-label break-words no-underline hover:bg-tint',
          isOpen ? 'bg-tint font-semibold text-ink-heading' : 'font-normal text-ink',
        )}
      >
        {title}
      </Link>
    </li>
  );
}

/** One section: its label with a "+" for a new entry, then its entries. */
function ContentsSection({
  slug,
  section,
  bible,
  openEntryId,
  onCreate,
}: {
  slug: string;
  section: BibleSection;
  bible: StoryBible;
  openEntryId: string | undefined;
  onCreate: () => void;
}) {
  const { t } = useAtlasTranslation();
  const sectionName = useBibleSectionName()(section);
  const entries = bible.entries.filter((entry) => entry.sectionId === section.id);
  const headingId = `atlas-bible-contents-${section.id}`;
  return (
    <li className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <h3
          id={headingId}
          className="m-0 min-w-0 type-label font-semibold break-words text-ink-heading"
        >
          {sectionName}
        </h3>
        {/* The "+" has no words, so its name says what it adds and where (WCAG 4.1.2); 44 px
            is over the 24 px smallest target (WCAG 2.5.8). */}
        <button
          type="button"
          aria-label={t('bible.contents.newEntryIn', { section: sectionName })}
          title={t('bible.contents.newEntryIn', { section: sectionName })}
          onClick={onCreate}
          className="tmc-focus inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink-muted hover:bg-tint hover:text-ink-heading"
        >
          <ActionIcon name="plus" size={20} />
        </button>
      </div>
      <ul aria-labelledby={headingId} className="m-0 flex list-none flex-col p-0">
        {entries.length === 0 && (
          <li className="px-3 py-1 type-meta text-ink-muted">{t('bible.contents.noEntries')}</li>
        )}
        {entries.map((entry) => (
          <EntryRow
            key={entry.id}
            to={`/plan/s/${slug}/world/${entry.id}`}
            title={entry.title}
            isOpen={entry.id === openEntryId}
          />
        ))}
      </ul>
    </li>
  );
}

/**
 * Renders the contents.
 *
 * @returns the nav with every section, its entries and Manage sections
 */
export function BibleContents({ slug, bible, openEntryId, onCreateEntry }: BibleContentsProps) {
  const { t } = useAtlasTranslation();
  const [failed, setFailed] = useState(false);

  /** "New entry in …": makes it, or says plainly that it couldn't. */
  function create(sectionId: string) {
    setFailed(false);
    void onCreateEntry(sectionId).catch(() => setFailed(true));
  }

  return (
    <nav aria-label={t('bible.contents.navLabel')} className="flex min-w-0 flex-col gap-2">
      <div aria-live="polite">
        {failed && <Notice tone="error">{t('bible.contents.createFailed')}</Notice>}
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {bible.sections.map((section) => (
          <ContentsSection
            key={section.id}
            slug={slug}
            section={section}
            bible={bible}
            openEntryId={openEntryId}
            onCreate={() => create(section.id)}
          />
        ))}
      </ul>
      {/* Board E27: a text button at the foot, its words lined up with the entries. */}
      <Link
        to={`/plan/s/${slug}/world`}
        className={buttonClassName({ variant: 'text' }, 'self-start')}
      >
        {t('bible.contents.manage')}
      </Link>
    </nav>
  );
}
