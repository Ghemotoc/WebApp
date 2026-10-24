/**
 * Which link addresses user text may carry (CLAUDE.md rule 8; stories S1-E3-02a and S1-E3-03).
 *
 * Who calls it: the chapter converters and the editor's link rules (src/features/writing/lib/),
 * and ChapterText when it shows a chapter (src/features/reading/components/). One rule in one
 * place, so the editor, what is stored and what readers see never disagree.
 */

/** The link protocols user text may use. */
const allowedLinkProtocols = ['http:', 'https:', 'mailto:'];

/**
 * True when a link address is one user text may carry.
 *
 * @param href - the address as typed, pasted or stored
 * @returns false for javascript:, data: and anything that isn't a full http, https or mailto address
 */
export function isAllowedLink(href: string): boolean {
  try {
    return allowedLinkProtocols.includes(new URL(href).protocol);
  } catch {
    return false;
  }
}
