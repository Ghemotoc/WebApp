/**
 * CrossLinkChips: the [[Name]] links found in an editing field, as chips under it (story
 * S1-E17-31: "under editing fields, the detected links show as chips I can choose").
 *
 * A link that resolves is a chip-shaped link to its character, entry or chapter; one that
 * doesn't is a grey pill reading "<name>: not found yet". Nothing shows while the fields hold no
 * links. Who uses it: IdeaItem, BibleEntryEditor and TimelineEventItem. What it calls:
 * lib/crossLinks.ts, lib/itemAddress.ts, useOpenStorySlug and useLinkTargets.
 */
import { Link } from 'react-router';

import { InfoPill } from '@/components/ui/InfoPill';

import { useLinkTargets } from '../hooks/useLinkTargets';
import { useOpenStorySlug } from '../hooks/useOpenStorySlug';
import { linkNamesIn, resolveCrossLink } from '../lib/crossLinks';
import { itemAddress } from '../lib/itemAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** The interactive chip's look (the pill system: white, #8E7B99 border, plum text, 36 px). */
const chipLink =
  "relative inline-flex h-9 items-center rounded-full border border-control-border bg-surface px-3.5 text-sm leading-none font-semibold text-heading no-underline hover:bg-tint after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']";

/**
 * Renders the chips.
 *
 * @param props.texts - the fields' saved text (the chips follow each save)
 * @returns the labelled list of chips, or nothing when there are no links
 */
export function CrossLinkChips({ texts }: { texts: string[] }) {
  const { t } = useAtlasTranslation();
  // The links resolve against the open story's names.
  const slug = useOpenStorySlug();
  const { index, isLoaded } = useLinkTargets(slug);
  const names = linkNamesIn(texts.join('\n'));
  // Nothing until the story's names have loaded, so no chip flashes "not found yet".
  if (names.length === 0 || !isLoaded) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span aria-hidden="true" className="text-sm text-meta">
        {t('links.chipsLabel')}
      </span>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label={t('links.chipsLabel')}>
        {names.map((name) => {
          const target = resolveCrossLink(name, index);
          return (
            <li key={name}>
              {target === null ? (
                <InfoPill tone="neutral">{t('links.chipNotFound', { name })}</InfoPill>
              ) : (
                <Link
                  to={itemAddress(slug, { kind: target.kind, ref: target.ref, chapter: null })}
                  className={chipLink}
                >
                  {name}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
