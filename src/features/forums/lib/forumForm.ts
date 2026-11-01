/**
 * The staff forum form's starting values and choices (bundle FORUMS-1, part a; S1-E8-01, first
 * criterion: "staff set name, description, order and parent, up to two levels deep").
 *
 * Who calls it: components/staff/ForumForm.tsx and ForumsAdminPage. It calls nothing: plain
 * functions over the forums api/forumAdmin.ts read.
 */
import type { ForumChanges, ForumName, StaffForum } from '../api/forumAdmin';
import type { ForumAccent } from '../api/forumIndex';

/** The colours a category can have, in the order the drop-down lists them. */
export const forumAccents: readonly ForumAccent[] = ['plum', 'sky', 'blush', 'sage', 'gold'];

/** The interface languages every forum is named in, Romanian first (the first market). */
export const forumLanguages: readonly string[] = ['ro', 'en'];

/**
 * The languages a forum's form shows: the interface languages and any other it has a name in.
 *
 * @param forum - the forum, or null for a new one
 * @returns language codes, Romanian first
 */
export function formLanguages(forum: StaffForum | null): string[] {
  const codes = new Set([
    ...forumLanguages,
    ...Object.keys(forum?.names ?? {}),
    ...(forum?.missingLanguages ?? []),
  ]);
  const others = [...codes].filter((code) => code !== 'ro').sort();
  return ['ro', ...others];
}

/**
 * The values a form starts with: the forum's own, or empty ones inside the chosen parent.
 *
 * @param forum - the forum being changed, or null to add one
 * @param parentId - for a new one, where it goes (null for a category)
 * @returns the form's values
 */
export function startingValues(forum: StaffForum | null, parentId: string | null): ForumChanges {
  const emptyName: ForumName = { name: '', description: '' };
  const names = Object.fromEntries(
    formLanguages(forum).map((code) => [code, forum?.names[code] ?? emptyName]),
  );
  if (forum === null) {
    return {
      forumId: null,
      parentId,
      slug: '',
      position: 1,
      isPinned: false,
      accent: 'plum',
      doodle: null,
      names,
    };
  }
  return {
    forumId: forum.id,
    parentId: forum.parentId,
    slug: forum.slug,
    position: forum.position,
    isPinned: forum.isPinned,
    accent: forum.accent,
    doodle: forum.doodle,
    names,
  };
}

/**
 * The forums a forum may sit in: every category and forum (never a subforum, which can't hold
 * forums), except the forum itself.
 *
 * @param forums - every live forum
 * @param editingId - the forum being changed, or null
 * @returns the possible parents, in tree order
 */
export function parentChoices(forums: StaffForum[], editingId: string | null): StaffForum[] {
  return forums.filter((forum) => forum.level < 2 && forum.id !== editingId);
}

/**
 * Lists the forums in tree order: each category, then its forums, each followed by its
 * subforums, all in staff's order.
 *
 * @param forums - every live forum
 * @returns the same forums, ordered for the staff list
 */
export function inTreeOrder(forums: StaffForum[]): StaffForum[] {
  const byPosition = (first: StaffForum, second: StaffForum) =>
    first.position - second.position || first.slug.localeCompare(second.slug);
  const childrenOf = (parentId: string | null) =>
    forums.filter((forum) => forum.parentId === parentId).sort(byPosition);
  // Walk down from the categories; three levels at most.
  const ordered: StaffForum[] = [];
  const visit = (forum: StaffForum) => {
    ordered.push(forum);
    childrenOf(forum.id).forEach(visit);
  };
  childrenOf(null).forEach(visit);
  return ordered;
}

/**
 * A forum's name to show staff: Romanian, else English, else its address.
 *
 * @param forum - the forum
 * @param language - the staff member's interface language
 * @returns the name
 */
export function staffForumName(forum: StaffForum, language: string): string {
  return forum.names[language]?.name || forum.names['ro']?.name || forum.slug;
}
