/**
 * CrossLinkLine: the [[Name]] links found in a story world entry, as one quiet line under it (user
 * stories bundle 6, story 6.8, board E27: "Links: Mrs Dobre · Mara Rus · The lift").
 *
 * A link that resolves opens its character, entry or chapter; one that doesn't reads "<name> (not
 * found yet)". Nothing shows while the text holds no links, or until the story's names load, so no
 * name flashes "not found yet". The editing fields keep CrossLinkChips.
 * Who uses it: BibleEntryView. What it calls: lib/crossLinks.ts, lib/itemAddress.ts,
 * useOpenStorySlug and useLinkTargets.
 */
import { Fragment } from 'react';
import { Link } from 'react-router';

import { useLinkTargets } from '../hooks/useLinkTargets';
import { useOpenStorySlug } from '../hooks/useOpenStorySlug';
import { linkNamesIn, resolveCrossLink } from '../lib/crossLinks';
import { itemAddress } from '../lib/itemAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the line.
 *
 * @param props.text - the entry's saved text
 * @returns "Links: …", or nothing when there are no links
 */
export function CrossLinkLine({ text }: { text: string }) {
  const { t } = useAtlasTranslation();
  // The links resolve against the open story's names.
  const slug = useOpenStorySlug();
  const { index, isLoaded } = useLinkTargets(slug);
  const names = linkNamesIn(text);
  if (names.length === 0 || !isLoaded) return null;
  return (
    <p className="m-0 type-meta text-ink-muted">
      {t('links.chipsLabel')}{' '}
      {names.map((name, position) => {
        const target = resolveCrossLink(name, index);
        return (
          <Fragment key={name}>
            {/* A middot between the names, as the board's meta lines join facts. */}
            {position > 0 && ' · '}
            {target === null ? (
              t('links.lineNotFound', { name })
            ) : (
              <Link
                to={itemAddress(slug, { kind: target.kind, ref: target.ref, chapter: null })}
                className="text-link underline"
              >
                {name}
              </Link>
            )}
          </Fragment>
        );
      })}
    </p>
  );
}
