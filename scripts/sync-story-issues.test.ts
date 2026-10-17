/**
 * Tests for the story issue sync (story S1-E1-01).
 * Proves the acceptance criterion "each story ID is one GitHub Issue": every story is found, a
 * story that already has an issue is never created twice, and "Won't" stories are skipped.
 */
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  findStoriesWithoutIssues,
  issueForStory,
  parseStories,
  readStage1Stories,
} from './sync-story-issues';

const sampleStories = `
##### S1-E1-01 Repository, environments and CI skeleton

- **Priority:** Must · **Size:** M · **Depends on:** none

##### S1-E1-06 Move from Lovable's database

- **Priority:** Won't (replaced) · **Size:** M

##### S1-E1-QA Epic check: Foundations

- **Priority:** Must · **Size:** S
`;

describe('the story issue sync', () => {
  it('finds each story heading with its ID, title and priority', () => {
    const stories = parseStories(sampleStories, 's1-e01.md');

    expect(stories).toEqual([
      {
        id: 'S1-E1-01',
        title: 'Repository, environments and CI skeleton',
        priority: 'Must',
        fileName: 's1-e01.md',
      },
      {
        id: 'S1-E1-06',
        title: "Move from Lovable's database",
        priority: "Won't (replaced)",
        fileName: 's1-e01.md',
      },
      { id: 'S1-E1-QA', title: 'Epic check: Foundations', priority: 'Must', fileName: 's1-e01.md' },
    ]);
  });

  it('skips a story that already has an issue, open or closed, and skips "Won\'t" stories', () => {
    const stories = parseStories(sampleStories, 's1-e01.md');

    const missing = findStoriesWithoutIssues(stories, ['S1-E1-01: Repository, environments']);

    expect(missing.map((story) => story.id)).toEqual(['S1-E1-QA']);
  });

  it('titles each new issue "<story ID>: <title>", matching the commit and pull request convention', () => {
    const [story] = parseStories(sampleStories, 's1-e01.md');
    if (story === undefined) throw new Error('the sample has no story');

    expect(issueForStory(story).title).toBe('S1-E1-01: Repository, environments and CI skeleton');
  });

  it('finds every Stage 1 story in docs/stories, each ID once', () => {
    const storiesFolder = fileURLToPath(new URL('../docs/stories', import.meta.url));
    const ids = readStage1Stories(storiesFolder).map((story) => story.id);

    expect(ids).toContain('S1-E1-01');
    expect(new Set(ids).size).toBe(ids.length);
  });
});
