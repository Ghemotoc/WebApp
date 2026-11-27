/**
 * The forums a new thread can go in, for the Forum drop-down on New thread (bundle BOOKS-7, board
 * F04, user story 7.4: "Opened from New thread on Together (the forum is picked here)").
 *
 * Every forum and subforum in the main forums, in the index's order, with subforums marked by a
 * dash. Categories are left out (a thread goes in a forum inside one), and so are spaces: a
 * space's threads start on the space's own page.
 * Who calls it: NewThreadPage. What it calls: buildForumTree.
 */
import type { SelectOption } from '@/components/ui/Select';

import type { ForumEntry } from '../api/forumIndex';

import { buildForumTree } from './forumTree';

/**
 * Builds the drop-down's choices.
 *
 * @param entries - the forum index
 * @param pickLabel - the words for the empty first choice ("Pick a forum")
 * @returns the options, the empty choice first
 */
export function newThreadForumOptions(entries: ForumEntry[], pickLabel: string): SelectOption[] {
  const options: SelectOption[] = [{ value: '', label: pickLabel }];
  for (const group of buildForumTree(entries)) {
    for (const { forum, subforums } of group.forums) {
      options.push({ value: forum.slug, label: forum.name });
      for (const subforum of subforums) {
        options.push({ value: subforum.slug, label: `— ${subforum.name}` });
      }
    }
  }
  return options;
}
