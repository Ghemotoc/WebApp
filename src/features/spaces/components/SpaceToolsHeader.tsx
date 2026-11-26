/**
 * SpaceToolsHeader: the top of each page that runs a space: the breadcrumb, the page's title, a
 * lead line and the row of the space's pages (bundle BOOKS-7, boards F10 to F12).
 *
 * Who shows it: SpaceSettingsPage, SpaceMembersPage and SpaceLogPage. What it calls:
 * SpaceBreadcrumb and SpaceSectionNav.
 */
import type { ReactNode } from 'react';

import type { Space } from '../api/spaces';

import { SpaceBreadcrumb } from './SpaceBreadcrumb';
import { SpaceSectionNav } from './SpaceSectionNav';

/** What the header needs. */
export interface SpaceToolsHeaderProps {
  space: Space;
  /** The page's title, also the breadcrumb's last step. */
  title: string;
  /** The lead line under the title. */
  intro: ReactNode;
}

/**
 * Renders the header.
 *
 * @returns the page's header
 */
export function SpaceToolsHeader({ space, title, intro }: SpaceToolsHeaderProps) {
  return (
    <header className="flex flex-col gap-12">
      <div className="flex flex-col gap-8">
        <SpaceBreadcrumb space={space} current={title} />
        <div className="flex flex-col gap-2">
          <h1 className="page-title m-0 break-words">{title}</h1>
          <p className="m-0 max-w-[34em] type-body text-ink-muted">{intro}</p>
        </div>
      </div>
      <SpaceSectionNav space={space} />
    </header>
  );
}
