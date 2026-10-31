/**
 * BibleContents: the left side of the bible page, every section with its entries (stories
 * S1-E17-17 and S1-E17-18).
 *
 * "Manage sections" opens the section list on the right; under each section, its entries are
 * links (the open one carries aria-current and a filled background, not colour alone) and
 * "New entry" makes one there and opens it for editing.
 * Who uses it: BiblePage. What it calls: the onCreateEntry prop (useStoryBible's createEntry).
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
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

/** One section: its name, its entries and "New entry". */
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
    <li className="flex flex-col gap-1 border-b border-hairline py-3 last:border-b-0">
      <h3 id={headingId} className="m-0 font-heading text-base font-bold break-words text-heading">
        {sectionName}
      </h3>
      {entries.length === 0 && (
        <p className="m-0 text-sm text-meta">{t('bible.contents.noEntries')}</p>
      )}
      {entries.length > 0 && (
        <ul aria-labelledby={headingId} className="m-0 list-none p-0">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link
                to={`/plan/s/${slug}/bible/${entry.id}`}
                aria-current={entry.id === openEntryId ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center rounded-xl px-2 py-1.5 break-words text-heading no-underline hover:bg-tint',
                  entry.id === openEntryId && 'bg-tint font-semibold',
                )}
              >
                {entry.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {/* The name says which section, and starts with the words shown (WCAG 2.5.3). */}
      <Button
        variant="secondary"
        className="self-start"
        aria-label={t('bible.contents.newEntryIn', { section: sectionName })}
        onClick={onCreate}
      >
        {t('bible.contents.newEntry')}
      </Button>
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
    <nav
      aria-labelledby="atlas-bible-contents-heading"
      className="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-surface px-5 py-5 shadow-card"
    >
      <h2
        id="atlas-bible-contents-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('bible.contents.heading')}
      </h2>
      <Link to={`/plan/s/${slug}/bible`} className="self-start font-semibold text-link">
        {t('bible.contents.manage')}
      </Link>
      <div aria-live="polite">
        {failed && <Notice tone="error">{t('bible.contents.createFailed')}</Notice>}
      </div>
      <ul className="m-0 list-none p-0">
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
