/**
 * AtlasFrame: the layout every Story Atlas page shares (bundle CALM-9a, boards D01 and E20 to E34,
 * approved by Robert on 22 Nov 2026).
 *
 * The top bar runs across the page. Under it, on a desktop (from 1024 px), the sections are a
 * 232 px side menu with the page's own content beside it, 48 px apart; on tablets and phones the
 * sections are one line that scrolls sideways above the content. A signed-out visitor sees the
 * content only (the page says why), with no bar or menu.
 * Both menus are drawn and CSS shows one: a screen reader and the keyboard meet only the one on
 * screen, because the other is display:none.
 * Who uses it: StoryAtlasPage, CharactersPage, ConnectionsPage, BiblePage, StorylinePage,
 * IdeasPage, MarketingPage, ReaderViewPage, PlanPreviewPage and AtlasSearchPage. What it calls:
 * PageContainer, AtlasTopBar and AtlasSectionNav; useRememberAtlasSection keeps the open section
 * for the story, so links into the Atlas come back to it (design books item 17).
 */
import type { ReactNode } from 'react';

import { PageContainer } from '@/components/ui/PageContainer';

import { useRememberAtlasSection } from '../hooks/useLastAtlasSection';
import { AtlasSectionNav, type AtlasSection } from './AtlasSectionNav';
import { AtlasTopBar } from './AtlasTopBar';

/** What the frame needs. */
export interface AtlasFrameProps {
  /** The story open now. */
  slug: string;
  /** Where "Write" goes: the latest chapter, or the chapter list. */
  writeAddress: string;
  /** The section open now, or null on the search page. */
  section: AtlasSection | null;
  /** False while nobody is signed in: then only the content shows. */
  showsChrome: boolean;
  /** The page's own content. */
  children: ReactNode;
}

/**
 * Renders the frame.
 *
 * @returns the page with the top bar, the sections menu and the content
 */
export function AtlasFrame({
  slug,
  writeAddress,
  section,
  showsChrome,
  children,
}: AtlasFrameProps) {
  // The writer's own Atlas: keep the open section for the next visit (design books item 17).
  useRememberAtlasSection(slug, showsChrome ? section : null);
  // Signed out: the content alone, which says the plan is only for its writer.
  if (!showsChrome) {
    return (
      <PageContainer className="tmc-rise flex flex-col gap-8 pt-8 pb-12">{children}</PageContainer>
    );
  }
  return (
    <PageContainer className="tmc-rise flex flex-col gap-6 pt-8 pb-12">
      <AtlasTopBar slug={slug} writeAddress={writeAddress} section={section} />
      <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start lg:gap-12">
        {/* Desktop: the side menu, kept in view while the content scrolls. */}
        <aside className="hidden w-[232px] shrink-0 lg:sticky lg:top-24 lg:block">
          <AtlasSectionNav slug={slug} current={section} layout="side" />
        </aside>
        {/* Tablet and phone: one sideways line above the content. */}
        <div className="min-w-0 lg:hidden">
          <AtlasSectionNav slug={slug} current={section} layout="line" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-8">{children}</div>
      </div>
    </PageContainer>
  );
}
