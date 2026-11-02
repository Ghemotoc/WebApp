/**
 * How a space looks: its banner colours and the letters in its round badge (bundle FORUMS-2,
 * part a; story S1-E8-06; design/boards/Space.dc.html's header).
 *
 * The owner picks one of four drawn banners for now; uploaded banner pictures come with the
 * picture check in part b (S1-E10-05 checks every picture before anyone sees it, rule 19).
 * The banner and badge are decoration with no text on the banner, so they are fixed colours
 * taken from the board rather than light and night tokens.
 * Who calls it: SpaceHeaderCard, SpaceRow and SpaceBannerChoice.
 */
import type { SpaceBanner } from '../api/spaces';

/** The banner band's background, per banner (the board's plum gradient first). */
export const bannerBackgrounds: Record<SpaceBanner, string> = {
  plum: 'radial-gradient(ellipse at 12% 120%, rgba(154,91,184,0.6) 0, rgba(154,91,184,0) 46%), linear-gradient(120deg,#2A0E33 0%,#481C5F 55%,#672786 100%)',
  night:
    'radial-gradient(ellipse at 12% 120%, rgba(91,124,184,0.6) 0, rgba(91,124,184,0) 46%), linear-gradient(120deg,#0E1633 0%,#1C2F5F 55%,#27488A 100%)',
  forest:
    'radial-gradient(ellipse at 12% 120%, rgba(108,168,120,0.6) 0, rgba(108,168,120,0) 46%), linear-gradient(120deg,#0E2616 0%,#1D4A2B 55%,#2E6B40 100%)',
  gold: 'radial-gradient(ellipse at 12% 120%, rgba(240,200,110,0.7) 0, rgba(240,200,110,0) 46%), linear-gradient(120deg,#5C3F0E 0%,#8A6418 55%,#B98A2A 100%)',
};

/** The badge's background and letter colour, per banner (white letters reach 4.5:1 on each). */
export const badgeStyles: Record<SpaceBanner, { background: string; color: string }> = {
  plum: { background: 'linear-gradient(140deg,#4D1B5E,#7A3D96)', color: '#FFFFFF' },
  night: { background: 'linear-gradient(140deg,#1C2F5F,#33508F)', color: '#FFFFFF' },
  forest: { background: 'linear-gradient(140deg,#1D4A2B,#2E6B40)', color: '#FFFFFF' },
  gold: { background: 'linear-gradient(140deg,#5C3F0E,#7D5A17)', color: '#FFFFFF' },
};

/**
 * The letters in a space's badge: the first letters of its first two words ("Fantasy writers'
 * circle" → "FW"), or the first two letters of a one-word name.
 *
 * @param name - the space's name
 * @returns one or two capital letters
 */
export function spaceInitials(name: string): string {
  const words = name.split(/\s+/).filter((word) => word !== '');
  const first = words[0] ?? '';
  const second = words[1];
  const letters =
    second === undefined ? first.slice(0, 2) : `${first.slice(0, 1)}${second.slice(0, 1)}`;
  return letters.toLocaleUpperCase();
}
