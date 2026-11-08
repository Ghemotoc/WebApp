/**
 * The groups Settings is split into, one shown at a time (bundle PROFILE-1, 6 Nov 2026: Robert,
 * 11:21 UTC: "it's very long, you need to scroll a lot, so I will need it to be compartmentalized
 * a bit better"; the side menu follows design/boards/Settings.dc.html).
 *
 * Each group has a key, which is also its address (/settings#privacy), and the anchors of the
 * panels inside it. Emails, notices and other screens link to those anchors (/settings#teacher-
 * badge, /settings#download-my-stories), so an anchor opens the group that holds it.
 * Who uses it: hooks/useSettingsGroup.ts and components/SettingsPage.tsx. What it calls: nothing.
 */

/** Every group, in the order of the menu. */
export const settingsGroupKeys = [
  'profile',
  // How the site looks: theme, mode and seasonal looks (bundle G2 THEMES).
  'appearance',
  'account',
  'privacy',
  'notifications',
  'messages',
  'download-my-data',
  'support',
  'delete-account',
] as const;

/** One group's key. */
export type SettingsGroupKey = (typeof settingsGroupKeys)[number];

/** The group Settings opens on when the address names none. */
export const firstSettingsGroup: SettingsGroupKey = 'profile';

/**
 * The anchors inside each group that other screens link to, besides the group's own key. Keep
 * this in step with the panels each group shows in SettingsPage.tsx.
 */
const anchorsOfGroup: Record<SettingsGroupKey, readonly string[]> = {
  profile: ['forum-signature', 'teacher-badge'],
  appearance: [],
  // Ways to log in sits here: while its sign-in flags are off it shows nothing, so it can't be a
  // group of its own; its old address (/settings#ways-to-log-in, in emails) still opens it.
  account: ['ways-to-log-in'],
  privacy: ['parent-consent'],
  notifications: [],
  messages: [],
  'download-my-data': ['download-my-stories', 'data-requests'],
  support: [],
  'delete-account': [],
};

/**
 * True when a text is one of the group keys.
 *
 * @returns whether it names a group
 */
function isGroupKey(text: string): text is SettingsGroupKey {
  return (settingsGroupKeys as readonly string[]).includes(text);
}

/**
 * The group an address's hash opens: the group it names, the group holding the anchor it names,
 * or the first group for anything else (no hash, or an unknown one).
 *
 * @param hash - the address's hash, with or without its leading "#"
 * @returns the group to show
 */
export function settingsGroupOfHash(hash: string): SettingsGroupKey {
  // Step 1: drop the "#"; anchors are plain words with hyphens, so nothing needs decoding.
  const anchor = hash.replace(/^#/, '');
  if (anchor === '') return firstSettingsGroup;
  // Step 2: a group's own key opens it.
  if (isGroupKey(anchor)) return anchor;
  // Step 3: an anchor inside a group opens that group.
  const holder = settingsGroupKeys.find((key) => anchorsOfGroup[key].includes(anchor));
  return holder ?? firstSettingsGroup;
}
