/**
 * AtlasTopBar: the bar at the top of every Story Atlas page (stories S1-E17-01 and S1-E17-02).
 *
 * "Story Atlas", the story switcher, "Write" (the same story's chapters in the writer section,
 * so "Plan" and "Write" sit side by side, S1-E17 notes) and "New story", which opens the usual
 * New story form and comes back to the new story's plan (S1-E17-01). Under it, the row of
 * sections (AtlasSectionNav: At a glance, Characters, Connections). No doodles: a working screen
 * with many controls. Who uses it: StoryAtlasPage, CharactersPage and ConnectionsPage.
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';

import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasSectionNav, type AtlasSection } from './AtlasSectionNav';
import { StorySwitcher } from './StorySwitcher';

/** The pill links' shared look (the outline pills of Your writing). */
const pillLink =
  'inline-flex h-11 items-center rounded-full border border-control-border bg-surface px-5 text-sm font-semibold text-heading no-underline hover:bg-tint';

/**
 * Renders the bar.
 *
 * @param props.slug - the story open now
 * @param props.writeAddress - where "Write" goes: the latest chapter, or the chapter list
 * @param props.section - the Story Atlas section open now
 * @returns the bar
 */
export function AtlasTopBar({
  slug,
  writeAddress,
  section,
}: {
  slug: string;
  writeAddress: string;
  section: AtlasSection;
}) {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <StorySwitcher currentSlug={slug} />
        </div>
        <nav aria-label={t('eyebrow')} className="flex flex-wrap gap-3">
          <Link to={writeAddress} className={pillLink}>
            {t('switcher.write')}
          </Link>
          <Link to="/write/new?from=plan" className={pillLink}>
            {t('switcher.newStory')}
          </Link>
        </nav>
      </div>
      <AtlasSectionNav slug={slug} current={section} />
    </div>
  );
}
