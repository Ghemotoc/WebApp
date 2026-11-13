/**
 * Tests public/theme-init.js, the script that marks <html> before the page draws, as written and
 * as the build shrinks it (vite.config.ts, shrinkThemeInitPlugin; bundle CONTRAST-1).
 *
 * Why here: the file is plain JavaScript outside src/, loaded by index.html, so nothing imports
 * it. This test runs its text against a pretend window and document, in plain Node.
 * What it proves: the written file and the shrunk file set the same attributes, for a first
 * visit, for remembered choices (night, a look, less motion, high contrast), for a device that
 * asks for dark mode or more contrast, and when storage is blocked.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { minifySync } from 'vite';
import { describe, expect, it } from 'vitest';

const written = readFileSync(
  fileURLToPath(new URL('../public/theme-init.js', import.meta.url)),
  'utf8',
);
const shrunk = minifySync('theme-init.js', written);

/** What one pretend device remembers and asks for. */
interface Device {
  /** localStorage contents; null means storage is blocked and every read throws. */
  stored: Record<string, string> | null;
  /** The media queries that are true on this device. */
  matching: string[];
}

/**
 * Runs the script's text on a pretend device.
 *
 * @param code - the script, written or shrunk
 * @param device - what the device remembers and asks for
 * @returns the attributes the script set on <html>
 */
function attributesSetBy(code: string, device: Device): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pretendWindow = {
    localStorage: {
      getItem(key: string): string | null {
        if (device.stored === null) throw new Error('Storage is blocked.');
        return device.stored[key] ?? null;
      },
    },
    matchMedia: (query: string) => ({ matches: device.matching.includes(query) }),
  };
  const pretendDocument = {
    documentElement: {
      setAttribute(name: string, value: string) {
        attributes[name] = value;
      },
    },
  };
  // The script is our own file, run with stand-ins for the two globals it reads.
  new Function('window', 'document', code)(pretendWindow, pretendDocument);
  return attributes;
}

const devices: Record<string, Device> = {
  'a first visit': { stored: {}, matching: [] },
  'a device in dark mode': { stored: {}, matching: ['(prefers-color-scheme: dark)'] },
  'remembered choices': {
    stored: {
      'theme-preference': 'night',
      'theme-shown-look': 'candy',
      'less-motion': 'on',
      'high-contrast': 'on',
    },
    matching: [],
  },
  'switches left off': {
    stored: { 'less-motion': 'off', 'high-contrast': 'off', 'theme-shown-look': 'neon' },
    matching: [],
  },
  'a device that asks for more contrast': { stored: {}, matching: ['(prefers-contrast: more)'] },
  'blocked storage': { stored: null, matching: ['(prefers-contrast: more)'] },
};

describe('public/theme-init.js', () => {
  it('shrinks without errors to well under the written size', () => {
    expect(shrunk.errors).toEqual([]);
    expect(shrunk.code.length).toBeLessThan(written.length / 2);
  });

  for (const [name, device] of Object.entries(devices)) {
    it(`sets the same attributes written and shrunk: ${name}`, () => {
      expect(attributesSetBy(shrunk.code, device)).toEqual(attributesSetBy(written, device));
    });
  }

  it('marks a first visit light, in Lilac mist, with nothing else', () => {
    expect(attributesSetBy(written, { stored: {}, matching: [] })).toEqual({
      'data-theme': 'light',
      'data-look': 'lilac',
    });
  });

  it('marks remembered choices: night, the look, less motion and high contrast', () => {
    expect(attributesSetBy(written, devices['remembered choices'] as Device)).toEqual({
      'data-theme': 'night',
      'data-look': 'candy',
      'data-motion': 'less',
      'data-contrast': 'more',
    });
  });

  it('marks high contrast for a device that asks for it, even with storage blocked', () => {
    const attributes = attributesSetBy(written, devices['blocked storage'] as Device);
    expect(attributes['data-contrast']).toBe('more');
    expect(attributes['data-motion']).toBeUndefined();
  });
});
