/**
 * Unit tests for the forum index's order (FORUMS-1a; Q45: pinned categories first, the rest by
 * latest activity).
 */
import { describe, expect, it } from 'vitest';

import type { ForumEntry } from '../api/forumIndex';

import { buildForumTree, childrenOf, forumPath } from './forumTree';

/** A forum entry with sensible defaults. */
function entry(slug: string, changes: Partial<ForumEntry> = {}): ForumEntry {
  return {
    id: slug,
    parentId: null,
    level: 0,
    slug,
    position: 0,
    isPinned: false,
    accent: 'plum',
    doodle: null,
    name: slug,
    description: '',
    threadCount: 0,
    postCount: 0,
    latestActivityAt: null,
    latestPost: null,
    hasUnread: null,
    ...changes,
  };
}

const entries = [
  entry('quiet'),
  entry('busy', { latestActivityAt: '2026-11-01T10:00:00Z' }),
  entry('second-pinned', { isPinned: true, position: 2 }),
  entry('first-pinned', { isPinned: true, position: 1 }),
  entry('forum-b', { parentId: 'first-pinned', level: 1, position: 2 }),
  entry('forum-a', { parentId: 'first-pinned', level: 1, position: 1 }),
  entry('subforum', { parentId: 'forum-a', level: 2 }),
];

describe('the forum index order', () => {
  it('puts pinned categories first in staff order, then the rest by latest activity', () => {
    const order = buildForumTree(entries).map((group) => group.category.slug);
    expect(order).toEqual(['first-pinned', 'second-pinned', 'busy', 'quiet']);
  });

  it('lists a category’s forums in staff order with their subforums', () => {
    const [first] = buildForumTree(entries);
    expect(first?.forums.map((group) => group.forum.slug)).toEqual(['forum-a', 'forum-b']);
    expect(first?.forums[0]?.subforums.map((sub) => sub.slug)).toEqual(['subforum']);
  });

  it('finds the way down to a subforum for the breadcrumb', () => {
    expect(forumPath(entries, 'subforum').map((step) => step.slug)).toEqual([
      'first-pinned',
      'forum-a',
      'subforum',
    ]);
    expect(forumPath(entries, 'missing')).toEqual([]);
  });

  it('gives the forums inside one forum', () => {
    expect(childrenOf(entries, 'forum-a').map((child) => child.slug)).toEqual(['subforum']);
  });
});
