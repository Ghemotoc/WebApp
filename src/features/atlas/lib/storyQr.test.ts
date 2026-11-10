/**
 * Tests for lib/storyQr.ts: where a story's QR code can point and the file it downloads as
 * (bundle G10c3).
 */
import { describe, expect, it } from 'vitest';

import { qrChoices, qrFileName, qrSvgFile } from './storyQr';

describe('qrChoices', () => {
  it('offers only the story page when the world is private and there is no username', () => {
    expect(qrChoices('farul', null, false)).toEqual([{ destination: 'story', path: '/s/farul' }]);
  });

  it('adds the story’s world while it is shared and the profile once there is a username', () => {
    expect(qrChoices('farul', 'ink wolf', true)).toEqual([
      { destination: 'story', path: '/s/farul' },
      { destination: 'world', path: '/s/farul/atlas/world' },
      { destination: 'profile', path: '/u/ink%20wolf' },
    ]);
  });
});

describe('qrSvgFile', () => {
  it('draws black squares on white inside a quiet border', () => {
    const file = qrSvgFile('https://example.test/s/farul');
    expect(file.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(file).toContain('fill="#fff"');
    expect(file).toContain('fill="#000"');
    // The first square can't sit inside the 4-square border.
    expect(file).toContain('<path d="M4 4h1v1h-1z');
  });

  it('refuses an empty address', () => {
    expect(() => qrSvgFile('')).toThrow();
  });
});

describe('qrFileName', () => {
  it('names the file after the story, the place and the kind', () => {
    expect(qrFileName('farul', 'profile', 'png')).toBe('farul-qr-profile.png');
  });
});
