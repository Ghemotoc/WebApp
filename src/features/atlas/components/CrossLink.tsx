/**
 * CrossLink: one [[Name]] in reading text (story S1-E17-31: "when a link resolves, then it is
 * clickable"; "Given a link with no match, when it shows, then it reads 'not found yet', so I
 * can see what still needs creating").
 *
 * A resolved link is an ordinary underlined link to its character, entry or chapter. One that
 * resolves to nothing shows the name with a dashed underline and the words "not found yet" (in
 * words, not by colour alone). On a readers' page (S1-E17-32) only public items resolve, a name
 * with no public match reads as plain words (never "not found yet", never a hint of a private
 * item), and a match opens the reader page that shows it.
 * Who uses it: CrossLinkText and BibleMarkdown. What it calls: lib/itemAddress.ts and the
 * readers' links from useCrossLinks.
 */
import { useContext } from 'react';
import { Link } from 'react-router';

import type { LinkTarget } from '../api/links';
import { ReaderLinksContext } from '../hooks/useCrossLinks';
import { itemAddress } from '../lib/itemAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the link needs. */
export interface CrossLinkProps {
  slug: string;
  /** The name as written inside the brackets. */
  name: string;
  /**
   * What it points to; null when nothing has that name yet; undefined while the story's names
   * are still loading (the name then shows as plain words, so nothing flashes "not found yet").
   */
  target: LinkTarget | null | undefined;
}

/**
 * Renders the link.
 *
 * @returns a link, the name marked "not found yet", or the plain name while loading
 */
export function CrossLink({ slug, name, target }: CrossLinkProps) {
  const { t } = useAtlasTranslation();
  const reader = useContext(ReaderLinksContext);
  if (target === undefined) return <>{name}</>;
  // A readers' page: a public match opens its reader page; anything else is plain words.
  if (reader !== null) {
    const address = target === null ? null : reader.addressOf(target);
    if (address === null) return <>{name}</>;
    return (
      <Link to={address} className="text-link underline">
        {name}
      </Link>
    );
  }
  if (target === null) {
    return (
      <span data-testid="atlas-cross-link-missing">
        <span className="border-b border-dashed border-meta">{name}</span>{' '}
        <span className="text-sm text-meta">({t('links.notFound')})</span>
      </span>
    );
  }
  return (
    <Link
      to={itemAddress(slug, { kind: target.kind, ref: target.ref, chapter: null })}
      className="text-link underline"
    >
      {name}
    </Link>
  );
}
