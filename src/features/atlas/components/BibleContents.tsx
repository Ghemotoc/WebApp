/**
 * BibleContents: the left side of the bible page, every section with its entries (stories
 * S1-E17-17 and S1-E17-18).
 *
 * "Manage sections" opens the section list on the right. Each section is a small grey label with
 * a "+" button ("New entry in <section>", which makes one there and opens it for editing), then a
 * glass list of its entries (bundle G10 ATLAS, part c1; board AtlasWorld). The open entry carries
 * aria-current, a filled background and bold type, not colour alone.
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

/** One entry's row in a section's glass list; the open one sits on the tint, in bold. */
function EntryRow({ to, title, isOpen }: { to: string; title: string; isOpen: boolean }) {
  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        to={to}
        aria-current={isOpen ? 'page' : undefined}
        className={cn(
          'flex min-h-[52px] items-center px-[18px] py-2.5 text-[15px] break-words text-heading no-underline hover:bg-tint',
          isOpen ? 'bg-tint font-bold' : 'font-medium',
        )}
      >
        {title}
      </Link>
    </li>
  );
}

/** One section: its small label with a "+" for a new entry, then its entries in a glass list. */
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
      <div className="flex items-center justify-between gap-2 pr-2 pl-[18px]">
        <h3
          id={headingId}
          className="m-0 min-w-0 text-[13px] font-semibold tracking-[0.08em] break-words text-meta uppercase"
        >
          {sectionName}
        </h3>
        {/* The "+" has no words, so its name says what it adds and where (WCAG 4.1.2); 32 px
            is over the 24 px smallest target (WCAG 2.5.8). */}
        <button
          type="button"
          aria-label={t('bible.contents.newEntryIn', { section: sectionName })}
          title={t('bible.contents.newEntryIn', { section: sectionName })}
          onClick={onCreate}
          className="tmc-focus inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-meta hover:bg-tint hover:text-heading"
        >
          <ActionIcon name="plus" size={16} />
        </button>
      </div>
      {entries.length === 0 && (
        <p className="m-0 px-[18px] text-sm text-meta">{t('bible.contents.noEntries')}</p>
      )}
      {entries.length > 0 && (
        <ul
          aria-labelledby={headingId}
          className="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border bg-surface p-0 shadow-card"
        >
          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              to={`/plan/s/${slug}/world/${entry.id}`}
              title={entry.title}
              isOpen={entry.id === openEntryId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Renders the contents.
 *
 * @returns the card with every section and its entries
 */
export function BibleContents({ slug, bible, openEntryId, onCreateEntry }: BibleContentsProps) {
  const { t } = useAtlasTranslation();
  const [failed, setFailed] = useState(false);

  /** "New entry": makes it, or says plainly that it couldn't. */
  function create(sectionId: string) {
    setFailed(false);
    void onCreateEntry(sectionId).catch(() => setFailed(true));
  }

  return (
    <nav aria-labelledby="atlas-bible-contents-heading" className="flex min-w-0 flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="atlas-bible-contents-heading" className="m-0 text-base font-bold text-heading">
          {t('bible.contents.heading')}
        </h2>
        <Link
          to={`/plan/s/${slug}/world`}
          className={buttonClassName({ variant: 'secondary' }, 'h-9 px-4 text-[13px]')}
        >
          {t('bible.contents.manage')}
        </Link>
      </div>
      <div aria-live="polite">
        {failed && <Notice tone="error">{t('bible.contents.createFailed')}</Notice>}
      </div>
      <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
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
    </nav>
  );
}
