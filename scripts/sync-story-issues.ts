/**
 * Makes sure every Stage 1 story has exactly one GitHub Issue (story S1-E1-01; decided 16 Oct 2026,
 * late evening, Q39: one GitHub Issue per story ID).
 *
 * Who runs it: the "Sync story issues" workflow (.github/workflows/sync-story-issues.yml), started by
 * hand from GitHub's Actions tab. It can also run locally with `npm run issues:sync`.
 * What it reads: the `##### S1-E1-01 Title` headings in docs/stories/s1-*.md, and the repository's
 * existing issues (open and closed) through the GitHub REST API.
 * What it does: creates an issue titled "S1-E1-01: Title" for each story that has none yet.
 * It never edits or closes an issue, and it skips stories marked "Won't".
 * Environment: GITHUB_TOKEN (needs permission to write issues), GITHUB_REPOSITORY ("owner/repo"),
 * DRY_RUN ("true" lists what it would create without creating anything; the default).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** One story found in docs/stories/. */
export interface Story {
  /** The story ID, for example "S1-E1-01". */
  id: string;
  /** The story's title as written in its heading. */
  title: string;
  /** The text after "**Priority:**", for example "Must". Empty if the story has no priority line. */
  priority: string;
  /** The stories file it came from, for the link in the issue. */
  fileName: string;
}

/** A story heading: five hashes, the ID, a space and the title. */
const storyHeading = /^##### (S\d+-E\d+-[0-9A-Za-z]+) (.+)$/;

/** The story ID at the start of an issue title, for example "S1-E1-01: ..." or "S1-E1-01 ...". */
const issueTitleStoryId = /^(S\d+-E\d+-[0-9A-Za-z]+)\b/;

/**
 * Finds every story in one stories file.
 *
 * @param markdown - the file's contents
 * @param fileName - the file's name, kept on each story
 * @returns the stories in the order they appear
 */
export function parseStories(markdown: string, fileName: string): Story[] {
  const stories: Story[] = [];

  for (const line of markdown.split('\n')) {
    // A heading starts a new story.
    const headingMatch = storyHeading.exec(line.trim());
    if (headingMatch?.[1] !== undefined && headingMatch[2] !== undefined) {
      stories.push({ id: headingMatch[1], title: headingMatch[2], priority: '', fileName });
      continue;
    }
    // The first priority line after a heading belongs to that story.
    const currentStory = stories.at(-1);
    const priorityMatch = /\*\*Priority:\*\* ([^·]+)/.exec(line);
    if (currentStory !== undefined && currentStory.priority === '' && priorityMatch?.[1]) {
      currentStory.priority = priorityMatch[1].trim();
    }
  }

  return stories;
}

/**
 * Says whether a story should have an issue. Stories marked "Won't" are kept for the record only.
 *
 * @param story - a parsed story
 * @returns false for "Won't" stories
 */
export function isPlanned(story: Story): boolean {
  return !story.priority.startsWith("Won't");
}

/**
 * Works out which planned stories have no issue yet.
 *
 * @param stories - every parsed story
 * @param existingIssueTitles - the titles of every issue in the repository, open or closed
 * @returns the stories to create issues for
 */
export function findStoriesWithoutIssues(stories: Story[], existingIssueTitles: string[]): Story[] {
  // The story IDs that already have an issue, read from the start of each title.
  const idsWithIssues = new Set(
    existingIssueTitles
      .map((title) => issueTitleStoryId.exec(title)?.[1])
      .filter((id): id is string => id !== undefined),
  );

  return stories.filter((story) => isPlanned(story) && !idsWithIssues.has(story.id));
}

/**
 * Builds the title and body of a new issue.
 *
 * @param story - the story the issue tracks
 * @returns the fields GitHub's "create an issue" call needs
 */
export function issueForStory(story: Story): { title: string; body: string } {
  return {
    title: `${story.id}: ${story.title}`,
    body: [
      `Tracks story **${story.id}** (${story.priority || 'priority not set'}).`,
      '',
      `The story, its acceptance criteria and its legal notes are in \`docs/stories/${story.fileName}\`.`,
      'One story per branch and pull request; the pull request title starts with the story ID.',
    ].join('\n'),
  };
}

/**
 * Reads every Stage 1 stories file.
 *
 * @param storiesFolder - absolute path of docs/stories
 * @returns every story in every s1-*.md file
 */
export function readStage1Stories(storiesFolder: string): Story[] {
  return readdirSync(storiesFolder)
    .filter((fileName) => /^s1-.*\.md$/.test(fileName))
    .sort()
    .flatMap((fileName) =>
      parseStories(readFileSync(join(storiesFolder, fileName), 'utf8'), fileName),
    );
}

/**
 * Calls the GitHub REST API and fails with a plain message if GitHub says no.
 *
 * @param path - the API path, for example "/repos/owner/repo/issues"
 * @param token - a token that can read and write issues
 * @param init - extra fetch options (method and body when creating)
 * @returns the parsed JSON answer
 */
async function callGitHub(path: string, token: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub answered ${response.status} for ${path}: ${await response.text()}`);
  }
  return response.json();
}

/**
 * Fetches the title of every issue in the repository, open and closed, 100 at a time.
 * GitHub's issue list also contains pull requests; those are left out.
 *
 * @param repository - "owner/repo"
 * @param token - a token that can read issues
 * @returns every issue title
 */
async function listIssueTitles(repository: string, token: string): Promise<string[]> {
  const titles: string[] = [];

  for (let page = 1; ; page += 1) {
    const path = `/repos/${repository}/issues?state=all&per_page=100&page=${page}`;
    const issues = (await callGitHub(path, token)) as { title: string; pull_request?: unknown }[];
    titles.push(...issues.filter((issue) => issue.pull_request === undefined).map((i) => i.title));
    // A page with fewer than 100 entries is the last one.
    if (issues.length < 100) return titles;
  }
}

/** Reads the settings, lists what is missing and creates it (unless it is a dry run). */
async function main(): Promise<void> {
  // Step 1: read the settings from the environment and stop with a clear message if one is missing.
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const isDryRun = process.env.DRY_RUN !== 'false';
  if (!token || !repository) {
    throw new Error('Set GITHUB_TOKEN and GITHUB_REPOSITORY ("owner/repo") before running this.');
  }

  // Step 2: compare the stories with the existing issues.
  const storiesFolder = fileURLToPath(new URL('../docs/stories', import.meta.url));
  const stories = readStage1Stories(storiesFolder);
  const missingStories = findStoriesWithoutIssues(
    stories,
    await listIssueTitles(repository, token),
  );
  console.log(`${stories.length} stories found, ${missingStories.length} without an issue.`);

  // Step 3: create one issue per missing story, one at a time to stay within GitHub's rate limits.
  for (const story of missingStories) {
    const issue = issueForStory(story);
    if (isDryRun) {
      console.log(`Would create: ${issue.title}`);
      continue;
    }
    await callGitHub(`/repos/${repository}/issues`, token, {
      method: 'POST',
      body: JSON.stringify(issue),
    });
    console.log(`Created: ${issue.title}`);
  }
  if (isDryRun)
    console.log('Dry run: nothing was created. Run again with dry run off to create them.');
}

// Run main() only when this file is started directly, not when a test imports it.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(`Story issue sync failed: ${String(error)}`);
    process.exitCode = 1;
  });
}
