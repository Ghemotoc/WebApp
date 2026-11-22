/**
 * AtlasTopBar: the card at the top of every Story Atlas page (stories S1-E17-01, S1-E17-02 and
 * S1-E17-30; redrawn in bundle CALM-9a, boards D01 and E20 to E34, approved by Robert on 22 Nov
 * 2026 after "it's harder to find the relationship page, and add characters, find the story").
 *
 * Left: where the writer is, as a breadcrumb ("Story Atlas / <story picker>"), then the text links
 * "Story page" (the reader's page of this story), "Write" (the same story's chapters, so "Story
 * Atlas" and "Write" sit side by side, S1-E17 notes) and "New story" (the usual New story form,
 * which comes back to the new story's plan, S1-E17-01).
 * Right: the search box and the two adds writers look for most, "New character" and "Add a
 * relationship". A page whose own main button already does one of them leaves it out here, so
 * the same button never shows twice (Characters drops New character, Relationships drops Add a
 * relationship).
 * The sections menu is not part of the bar: AtlasFrame puts it at the side on a desktop and under
 * the bar on tablets and phones.
 * Who uses it: AtlasFrame. What it calls: StorySwitcher, AtlasSearchBox and AtlasNewCharacter.
 */
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { buttonClassName } from '@/components/ui/buttonStyles';

import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasNewCharacter } from './AtlasNewCharacter';
import { AtlasSearchBox } from './AtlasSearchBox';
import type { AtlasSection } from './AtlasSectionNav';
import { StorySwitcher } from './StorySwitcher';

/** The text links' look: the underlined text button (CALM-2). */
const textLink = buttonClassName({ variant: 'text' });

/**
 * Renders the bar.
 *
 * @param props.slug - the story open now
 * @param props.writeAddress - where "Write" goes: the latest chapter, or the chapter list
 * @param props.section - the Story Atlas section open now, or null on the search page
 * @returns the card with the breadcrumb, the links and the adds
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
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-card border border-border bg-surface px-[18px] py-3 shadow-card">
      <AtlasWhereYouAre slug={slug} writeAddress={writeAddress} />
      <AtlasTopActions slug={slug} section={section} />
    </div>
  );
}

/** The breadcrumb with the story picker, then Story page, Write and New story. */
function AtlasWhereYouAre({ slug, writeAddress }: { slug: string; writeAddress: string }) {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
      <nav aria-label={t('breadcrumb.label')} className="flex min-w-0 items-center gap-2">
        <Link to="/plan" className="text-sm font-semibold whitespace-nowrap text-ink no-underline">
          {t('eyebrow')}
        </Link>
        {/* The slash is a separator only, so screen readers skip it. */}
        <span aria-hidden="true" className="text-meta">
          /
        </span>
        <StorySwitcher currentSlug={slug} />
      </nav>
      <div className="flex flex-wrap items-center gap-x-4">
        <Link to={`/s/${slug}`} className={textLink}>
          {t('switcher.storyPage')}
        </Link>
        <Link to={writeAddress} className={textLink}>
          {t('switcher.write')}
        </Link>
        <Link to="/write/new?from=plan" className={textLink}>
          {t('switcher.newStory')}
        </Link>
      </div>
    </div>
  );
}

/** Search, then New character and Add a relationship unless the page already has that button. */
function AtlasTopActions({ slug, section }: { slug: string; section: AtlasSection | null }) {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex min-w-0 flex-wrap items-start gap-2">
      {/* The search page has its own wide bar, so the small box stays out there. */}
      {section !== null && <AtlasSearchBox slug={slug} />}
      {section !== 'characters' && <AtlasNewCharacter slug={slug} />}
      {section !== 'connections' && (
        // ?add=1 opens the Relationships page with its add form already open.
        <Link
          to={`/plan/s/${slug}/connections?add=1`}
          className={buttonClassName({ variant: 'secondary' })}
        >
          <ActionIcon name="link" />
          {t('connections.add.open')}
        </Link>
      )}
    </div>
  );
}
