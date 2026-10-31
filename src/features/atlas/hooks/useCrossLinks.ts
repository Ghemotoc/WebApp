/**
 * useCrossLinks: what [[Name]] links resolve against: the writer's whole story in Story Atlas
 * (S1-E17-31), or only the public items on a readers' page (S1-E17-32: "when a public item links
 * to a private one, readers see the name as plain text, never a link or a hint").
 *
 * Who calls it: BibleMarkdown, CrossLinkText and CrossLink. What it calls: useLinkTargets for
 * the writer; on a readers' page, PublicPlanView provides ReaderLinksContext instead and the
 * writer's read never runs.
 */
import { createContext, useContext } from 'react';

import type { LinkTarget } from '../api/links';
import type { LinkIndex } from '../lib/crossLinks';

import { useLinkTargets } from './useLinkTargets';
import { useOpenStorySlug } from './useOpenStorySlug';

/** A readers' page's links: the public items only, and where each one opens. */
export interface ReaderLinks {
  index: LinkIndex;
  /** The reader page that shows a target, or null when it has none (it then reads as words). */
  addressOf: (target: LinkTarget) => string | null;
}

/** Set by PublicPlanView around a readers' page; null (the default) in Story Atlas. */
export const ReaderLinksContext = createContext<ReaderLinks | null>(null);

/**
 * The links' index for the page open now.
 *
 * @returns slug, index, isLoaded and reader (null in Story Atlas)
 */
export function useCrossLinks() {
  const reader = useContext(ReaderLinksContext);
  const slug = useOpenStorySlug();
  // On a readers' page the writer's own read is switched off (an empty slug disables it).
  const writer = useLinkTargets(reader === null ? slug : '');
  if (reader !== null) return { slug, index: reader.index, isLoaded: true, reader };
  return { slug, index: writer.index, isLoaded: writer.isLoaded, reader };
}
