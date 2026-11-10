/**
 * AtlasPageHeading: the line under the Story Atlas top bar, with the page's name as its heading on
 * the left and "Only you can see this plan." with a lock on the right (bundle G10 ATLAS, part a;
 * boards AtlasStory and AtlasCharacters). The story's title already shows in the top bar's story
 * switcher, so the heading names the section, not the story.
 *
 * Who uses it: the Story Atlas pages (StoryAtlasPage's AtAGlance, CharactersPage, ConnectionsPage,
 * BiblePage, StorylinePage, IdeasPage, MarketingPage and AtlasSearchPage).
 * What it calls: ActionIcon.
 */
import { ActionIcon } from '@/components/icons/ActionIcon';

import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the heading line.
 *
 * @param props.title - the page's name ("At a glance", "Characters")
 * @returns the h1 and the private note
 */
export function AtlasPageHeading({ title }: { title: string }) {
  const { t } = useAtlasTranslation();
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <h1 className="m-0 font-heading text-[clamp(30px,3.4vw,44px)] leading-[1.05] font-extrabold tracking-[-0.02em] break-words text-heading">
        {title}
      </h1>
      <p className="m-0 inline-flex items-center gap-1.5 text-sm text-meta">
        <ActionIcon name="lock" size={14} />
        {t('privateNote')}
      </p>
    </header>
  );
}
