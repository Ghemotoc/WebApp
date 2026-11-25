/**
 * AtlasPageHeading: the page's name as its display heading, with "Only you can see this plan."
 * and a lock under it (bundle G10 ATLAS, part a; redrawn as boards E21 to E34 in user stories
 * bundle 6). The story's title already shows in the top bar's breadcrumb and story picker, so the
 * heading names the section, not the story.
 *
 * Who uses it: the Story Atlas pages (StoryAtlasPage's AtAGlance, CharactersPage, ConnectionsPage,
 * BiblePage, StorylinePage, IdeasPage, MarketingPage and AtlasSearchPage).
 * What it calls: ActionIcon.
 */
import type { ReactNode } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';

import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the heading line.
 *
 * @param props.title - the page's name ("At a glance", "Characters")
 * @param props.action - the page's main button, drawn under the title (Characters' "New
 *   character", board E22), or nothing
 * @returns the h1, the action and the private note
 */
export function AtlasPageHeading({ title, action }: { title: string; action?: ReactNode }) {
  const { t } = useAtlasTranslation();
  return (
    <header className="flex flex-col gap-3">
      <h1 className="m-0 type-title break-words text-ink-heading lg:type-display">{title}</h1>
      {/* 12 px of gap plus 8 px: the board's 20 px between the title and its button. */}
      {action !== undefined && (
        <div className="mt-2 flex flex-wrap items-center gap-3">{action}</div>
      )}
      <p className="m-0 inline-flex items-center gap-2 type-meta">
        <ActionIcon name="lock" size={14} />
        {t('privateNote')}
      </p>
    </header>
  );
}
