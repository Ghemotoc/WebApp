/**
 * Tests for story links inside the website (bundle GAPS-7, part a): only a story, chapter or
 * passage address travels into Messages or can be pressed inside a message.
 * Who runs it: `npm test` (Vitest).
 */
import { describe, expect, it } from 'vitest';

import {
  isStoryPath,
  linkForStoryPath,
  messagesAddressForLink,
  sharedPathFrom,
  splitStoryLinks,
  storyPathOfLink,
} from './storyLinks';

const site = 'https://example.test';

describe('isStoryPath', () => {
  it('accepts a story, a chapter and a passage address', () => {
    expect(isStoryPath('/s/my-story')).toBe(true);
    expect(isStoryPath('/s/my-story/abcd1234')).toBe(true);
    expect(isStoryPath('/s/my-story/abcd1234/p3')).toBe(true);
    expect(isStoryPath('/s/my-story/abcd1234/p3-5')).toBe(true);
  });

  it('refuses every other address', () => {
    const refused = [
      '',
      '/',
      '/messages',
      '/s/',
      '/s/My-Story',
      '/s/my-story/',
      '/s/my-story/short',
      '/s/my-story/abcd1234/x',
      '/s/my-story?next=1',
      '/s/my-story#top',
      '//evil.test/s/my-story',
      'https://evil.test/s/my-story',
      '/s/../staff',
      'javascript:alert(1)',
      `/s/${'a'.repeat(200)}`,
    ];
    for (const path of refused) expect(isStoryPath(path), path).toBe(false);
  });
});

describe('sharedPathFrom', () => {
  it('gives the path back when it is a story address, and null otherwise', () => {
    expect(sharedPathFrom('/s/my-story/abcd1234')).toBe('/s/my-story/abcd1234');
    expect(sharedPathFrom(null)).toBeNull();
    expect(sharedPathFrom('https://evil.test')).toBeNull();
    expect(sharedPathFrom('Buy cheap things at evil.test')).toBeNull();
  });
});

describe('links and addresses', () => {
  it('builds the full link for a path, with or without a slash after the website', () => {
    expect(linkForStoryPath('/s/my-story', site)).toBe('https://example.test/s/my-story');
    expect(linkForStoryPath('/s/my-story', `${site}/`)).toBe('https://example.test/s/my-story');
  });

  it('takes the path out of this website’s story links only', () => {
    expect(storyPathOfLink('https://example.test/s/my-story/abcd1234', site)).toBe(
      '/s/my-story/abcd1234',
    );
    expect(storyPathOfLink('https://example.test/settings', site)).toBeNull();
    expect(storyPathOfLink('https://example.test.evil.test/s/my-story', site)).toBeNull();
    expect(storyPathOfLink('https://evil.test/s/my-story', site)).toBeNull();
  });

  it('builds the Messages address for a share link', () => {
    expect(messagesAddressForLink('https://example.test/s/my-story/abcd1234/p3-5', site)).toBe(
      '/messages?share=%2Fs%2Fmy-story%2Fabcd1234%2Fp3-5',
    );
    expect(messagesAddressForLink('https://evil.test/s/my-story', site)).toBeNull();
  });
});

describe('splitStoryLinks', () => {
  it('leaves a message without story links as one piece of plain words', () => {
    expect(splitStoryLinks('Hello there.\nSee https://evil.test/s/my-story now', site)).toEqual([
      { kind: 'text', text: 'Hello there.\nSee https://evil.test/s/my-story now' },
    ]);
  });

  it('finds a story link between words and keeps the full stop out of it', () => {
    expect(splitStoryLinks('Read https://example.test/s/my-story/abcd1234. Lovely!', site)).toEqual(
      [
        { kind: 'text', text: 'Read ' },
        {
          kind: 'storyLink',
          text: 'https://example.test/s/my-story/abcd1234',
          path: '/s/my-story/abcd1234',
        },
        { kind: 'text', text: '. Lovely!' },
      ],
    );
  });

  it('gives the message back unchanged when the pieces are joined', () => {
    const body = '  https://example.test/s/a  and (https://example.test/s/b/abcd1234/p2)\n\nbye ';
    const joined = splitStoryLinks(body, site)
      .map((piece) => piece.text)
      .join('');
    expect(joined).toBe(body);
  });

  it('does not make a link from a link with something glued to it', () => {
    const pieces = splitStoryLinks('https://example.test/s/my-story<script>', site);
    expect(pieces).toEqual([{ kind: 'text', text: 'https://example.test/s/my-story<script>' }]);
  });
});
