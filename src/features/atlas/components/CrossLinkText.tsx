/**
 * CrossLinkText: a plain text with its [[Name]] links drawn as links (story S1-E17-31, reading
 * views).
 *
 * Plain text only: the words are React text, never HTML, so nothing the writer typed can run
 * (CLAUDE.md rule 8). Who uses it: TimelineEventItem and PublicTimeline. What it calls:
 * lib/crossLinks.ts, useCrossLinks and CrossLink.
 */
import { useCrossLinks } from '../hooks/useCrossLinks';
import { resolveCrossLink, splitCrossLinks } from '../lib/crossLinks';

import { CrossLink } from './CrossLink';

/**
 * Renders the text.
 *
 * @param props.text - the text as stored
 * @returns the text's pieces, to sit inside the caller's paragraph
 */
export function CrossLinkText({ text }: { text: string }) {
  // The links resolve against the open story's names, or a readers' page's public items.
  const { slug, index, isLoaded } = useCrossLinks();
  return (
    <>
      {splitCrossLinks(text).map((piece, place) =>
        piece.kind === 'text' ? (
          <span key={place}>{piece.text}</span>
        ) : (
          <CrossLink
            key={place}
            slug={slug}
            name={piece.name}
            target={isLoaded ? resolveCrossLink(piece.name, index) : undefined}
          />
        ),
      )}
    </>
  );
}
