/**
 * AtlasTopBar: the two lines at the top of every Story Atlas page (stories S1-E17-01, S1-E17-02
 * and S1-E17-30; bundle CALM-9a; redrawn as board E21 in user stories bundle 6).
 *
 * First line: the breadcrumb, "Story Atlas / <the story's title>". Second line: "Story" with the
 * story picker, the text links "Story page" (the reader's page of this story) and "Write" (the
 * same story's chapters, so "Story Atlas" and "Write" sit side by side, S1-E17 notes), then at the
 * right "New character", "Add a relationship" and the search box with its Search button.
 * New character is the main button on At a glance, which has no main action of its own, and the
 * quiet one everywhere else (boards E21 to E34). Characters leaves New character out here, since
 * its own main button does it (board E22); Relationships keeps Add a relationship, which takes
 * the writer to the form at the foot of that page (board E25). The two adds show their words for the first
 * three visits on this device, then fold to their icons (story 6.2; lib/addHintVisits.ts). New
 * story lives on /plan (board E20).
 * The sections menu is not part of the bar: AtlasFrame puts it at the side on a desktop and under
 * the bar on tablets and phones.
 * Who uses it: AtlasFrame. What it calls: useMyStories (the title in the breadcrumb),
 * StorySwitcher, AtlasSearchBox, AtlasNewCharacter and lib/addHintVisits.ts.
 */
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { useMyStories } from '@/features/writing/hooks/useMyStories';
import { cn } from '@/lib/utils';

import { countAtlasVisit, showsAddHints } from '../lib/addHintVisits';
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
 * @returns the breadcrumb, then the picker, the links, the adds and the search
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
    <div className="flex min-w-0 flex-col gap-3">
      <AtlasBreadcrumb slug={slug} />
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <StorySwitcher currentSlug={slug} />
        <Link to={`/s/${slug}`} className={textLink}>
          {t('switcher.storyPage')}
        </Link>
        <Link to={writeAddress} className={textLink}>
          {t('switcher.write')}
        </Link>
        <AtlasTopActions slug={slug} section={section} />
      </div>
    </div>
  );
}

/** "Story Atlas / <title>": where the writer is (board E21). */
function AtlasBreadcrumb({ slug }: { slug: string }) {
  const { t } = useAtlasTranslation();
  const { stories } = useMyStories();
  const title = stories.find((story) => story.slug === slug)?.title;
  return (
    <nav aria-label={t('breadcrumb.label')} className="min-w-0">
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 type-meta">
        <li>
          <Link to="/plan" className="text-ink-muted underline underline-offset-[3px]">
            {t('eyebrow')}
          </Link>
        </li>
        {title !== undefined && (
          <li className="flex min-w-0 items-center gap-2">
            {/* The slash is a separator only, so screen readers skip it. */}
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="min-w-0 wrap-anywhere text-ink-muted">
              {title}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}

/**
 * Where the bar's Add a relationship goes: over an open character's sheet it opens the dialog
 * there (?add=relationship, user stories bundle 6, story 6.5, board E24); elsewhere, the
 * Relationships page included, it goes to that page's add form (?add=1, story 6.6, board E25).
 */
function useAddRelationshipAddress(slug: string, section: AtlasSection | null): string {
  const { characterId } = useParams();
  if (section === 'characters' && characterId !== undefined) {
    return `/plan/s/${slug}/characters/${characterId}?add=relationship`;
  }
  return `/plan/s/${slug}/connections?add=1`;
}

/** New character (unless the page has its own), Add a relationship, then search. */
function AtlasTopActions({ slug, section }: { slug: string; section: AtlasSection | null }) {
  const { t } = useAtlasTranslation();
  // The two adds show their words for the first three visits on this device, then fold to their
  // icons (story 6.2). Counted once per page load; later pages of the session don't count.
  const [visits] = useState(countAtlasVisit);
  const isCompact = !showsAddHints(visits);
  const addRelationshipAddress = useAddRelationshipAddress(slug, section);
  return (
    <div className="flex min-w-0 flex-auto flex-wrap items-start justify-end gap-3">
      <div className="flex flex-wrap items-start gap-2">
        {section !== 'characters' && (
          <AtlasNewCharacter slug={slug} isMain={section === 'glance'} isCompact={isCompact} />
        )}
        <Link
          to={addRelationshipAddress}
          className={cn(buttonClassName({ variant: 'secondary' }), isCompact && 'w-11 px-0')}
        >
          <ActionIcon name="link" />
          <span className={isCompact ? 'sr-only' : undefined}>{t('connections.add.open')}</span>
        </Link>
      </div>
      {/* The search page has its own wide bar, so the bar's box stays out there. */}
      {section !== null && <AtlasSearchBox slug={slug} />}
    </div>
  );
}
