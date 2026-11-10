/**
 * AtlasTopBar: the glass bar at the top of every Story Atlas page (stories S1-E17-01, S1-E17-02
 * and S1-E17-30; bundle G10 ATLAS, part a: the liquid glass boards draw it as one glass card).
 *
 * The first row holds the "Story Atlas" eyebrow and the story switcher on the left, and the search
 * box, "Write" (the same story's chapters in the writer section, so "Plan" and "Write" sit side by
 * side, S1-E17 notes) and "New story" (the usual New story form, which comes back to the new
 * story's plan, S1-E17-01) on the right. The second row is the sections (AtlasSectionNav), on one
 * line. On a phone the first row's parts stack.
 * Who uses it: every Story Atlas page (StoryAtlasPage, CharactersPage, ConnectionsPage, BiblePage,
 * StorylinePage, IdeasPage, MarketingPage, ReaderViewPage, PlanPreviewPage and AtlasSearchPage).
 * What it calls: StorySwitcher, AtlasSearchBox and AtlasSectionNav.
 */
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Eyebrow } from '@/components/ui/Eyebrow';

import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasSearchBox } from './AtlasSearchBox';
import { AtlasSectionNav, type AtlasSection } from './AtlasSectionNav';
import { StorySwitcher } from './StorySwitcher';

/** The pill links' shared look: grey glass, the add and "go elsewhere" actions (handoff, Buttons). */
const pillLink =
  'inline-flex h-11 shrink-0 items-center gap-2 rounded-full button-glass px-5 text-sm font-semibold whitespace-nowrap no-underline';

/**
 * Renders the bar.
 *
 * @param props.slug - the story open now
 * @param props.writeAddress - where "Write" goes: the latest chapter, or the chapter list
 * @param props.section - the Story Atlas section open now, or null on the search page
 * @returns the glass card with the two rows
 */
export function AtlasTopBar({
  slug,
  writeAddress,
  section,
}: {
  slug: string;
  writeAddress: string;
  section: AtlasSection | null;
}) {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex min-w-0 flex-col gap-3.5 rounded-card border border-border bg-surface px-[18px] py-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        {/* Left: where the writer is. */}
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <StorySwitcher currentSlug={slug} />
        </div>
        {/* Right: search this story, then go and write or start another story. */}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {/* The search page has its own wide bar, so the small box stays out there. */}
          {section !== null && <AtlasSearchBox slug={slug} />}
          <Link to={writeAddress} className={pillLink}>
            <ActionIcon name="pen" />
            {t('switcher.write')}
          </Link>
          <Link to="/write/new?from=plan" className={pillLink}>
            <ActionIcon name="plus" />
            {t('switcher.newStory')}
          </Link>
        </div>
      </div>
      <AtlasSectionNav slug={slug} current={section} />
    </div>
  );
}
