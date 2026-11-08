/**
 * shellScreens: which header a page gets on a narrow screen (bundle G4 SHELL; handoff "App header
 * and tab bar" and "Rules for the narrow screens").
 *
 * Below 1024 px the website shows the simpler phone and tablet screens:
 * - header A ("focus") for places where a person types, edits or reads: a back button and a short
 *   title, and no tab bar, so nothing floats over the words;
 * - header B ("browse") everywhere else: the logo pill, a pill with the bell, chats and avatar, and
 *   the floating tab bar at the bottom.
 * From 1024 px every page has the full website top bar instead.
 * Who calls it: AppLayout (through useShellScreen). What it calls: React Router's matchPath.
 * A new page that should get header A adds one line to focusScreens.
 */
import { matchPath } from 'react-router';

/** A header A page: its address pattern, its title's locale key and where Back goes. */
interface FocusScreenRule {
  pattern: string;
  /** A key under shell.focus in common.json. */
  titleKey: string;
  /**
   * Where Back goes when the person arrived straight from a link (no page of ours to go back to).
   * ":storySlug" and other parts of the pattern are filled in from the address.
   */
  backTo: string;
}

/** What the shell shows for one address. */
export type ShellScreen = { kind: 'browse' } | { kind: 'focus'; titleKey: string; backTo: string };

/**
 * The header A pages (handoff: the editor, publish, chapter plan, character, add relationship,
 * avatar, chat, thread, sign up, log in and age check; reading screens too, so no tab bar sits over
 * a chapter). Getting-in screens (sign up, log in, age check, not open) are here as well: they have
 * no tab bar. The first matching rule wins, so more exact patterns come first.
 */
const focusScreens: readonly FocusScreenRule[] = [
  // Getting in.
  { pattern: '/sign-up', titleKey: 'signUp', backTo: '/' },
  { pattern: '/join/:code', titleKey: 'signUp', backTo: '/' },
  { pattern: '/sign-in', titleKey: 'logIn', backTo: '/' },
  { pattern: '/forgot-password', titleKey: 'resetPassword', backTo: '/sign-in' },
  { pattern: '/reset-password', titleKey: 'resetPassword', backTo: '/sign-in' },
  { pattern: '/setup', titleKey: 'setUp', backTo: '/' },
  { pattern: '/not-open', titleKey: 'notOpen', backTo: '/' },
  { pattern: '/age-check', titleKey: 'ageCheck', backTo: '/' },
  { pattern: '/age-check/return', titleKey: 'ageCheck', backTo: '/' },
  // Writing and planning.
  { pattern: '/write/new', titleKey: 'newStory', backTo: '/write' },
  {
    pattern: '/write/s/:storySlug/c/:chapterCode',
    titleKey: 'editChapter',
    backTo: '/write/s/:storySlug/chapters',
  },
  {
    pattern: '/plan/s/:storySlug/characters/:characterId',
    titleKey: 'character',
    backTo: '/plan/s/:storySlug/characters',
  },
  // Reading.
  { pattern: '/s/:storySlug/:chapterCode', titleKey: 'reading', backTo: '/s/:storySlug' },
  { pattern: '/s/:storySlug/:chapterCode/:spot', titleKey: 'reading', backTo: '/s/:storySlug' },
  // Talking.
  { pattern: '/messages/:handle', titleKey: 'chat', backTo: '/messages' },
  { pattern: '/forums/:forumSlug/new', titleKey: 'newThread', backTo: '/forums/:forumSlug' },
  { pattern: '/forums/:forumSlug/:threadNumber', titleKey: 'thread', backTo: '/forums/:forumSlug' },
];

/**
 * Fills ":name" parts of a Back address from the matched address's parts. The parts come from the
 * address as the browser holds it, already encoded ("a%26b"), so they go back in unchanged;
 * encoding them again would turn "%" into "%25" and break the link.
 *
 * @param backTo - the Back address pattern
 * @param params - the parts React Router read from the address
 * @returns the Back address
 */
function fillBackAddress(backTo: string, params: Record<string, string | undefined>): string {
  return backTo.replace(/:([A-Za-z]+)/g, (whole, name: string) => {
    const value = params[name];
    return value ?? whole;
  });
}

/**
 * Decides which header an address gets on a narrow screen.
 *
 * @param pathname - the address's path, such as "/write/s/my-story/c/3"
 * @returns header A with its title and Back address, or header B
 */
export function shellScreenFor(pathname: string): ShellScreen {
  for (const rule of focusScreens) {
    const match = matchPath({ path: rule.pattern, end: true }, pathname);
    if (match !== null) {
      return {
        kind: 'focus',
        titleKey: rule.titleKey,
        backTo: fillBackAddress(rule.backTo, match.params),
      };
    }
  }
  return { kind: 'browse' };
}
