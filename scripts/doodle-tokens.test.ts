/**
 * Tests for the doodle token script (Lane B, "Design: doodles take their colours from the tokens",
 * 23 Oct 2026). Proves: the doodles in the repository hold no raw hex colour; every colour in the
 * map has a matching light token and a night token; the rewrite swaps a known colour for its
 * token, keeps the light value as the fallback, refuses an unknown colour, leaves cover
 * backgrounds alone and changes nothing when run twice; the check catches a raw colour and a
 * drifted fallback. See scripts/doodle-tokens.ts.
 */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  checkColourMap,
  doodleColourTokens,
  findRawColours,
  isCoverBackground,
  readDoodleTokens,
  runDoodleTokens,
  tokeniseDoodle,
  tokensCssPath,
} from './doodle-tokens';

const tokensCss = readFileSync(tokensCssPath, 'utf8');
const lightTokens = readDoodleTokens(tokensCss, 'light');
const nightTokens = readDoodleTokens(tokensCss, 'night');

/** A tiny doodle as the canvas exported it: upper-case hex colours, one path per colour. */
const canvasDoodle =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-64 -64 128 128"><title>test</title>' +
  '<path fill="#2A0E33" d="M0 0"/><path fill="#F2A7B8" d="M1 1"/></svg>';

/** A drawn cover background: the same folder, a different shape, colours left alone. */
const coverBackground =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 160">' +
  '<rect width="100" height="160" fill="#26142E"></rect></svg>';

describe('the doodle token check on the repository', () => {
  it('finds no raw hex colour in any doodle under design/assets', () => {
    const result = runDoodleTokens('check');

    expect(result.problems).toEqual([]);
    expect(result.skippedCovers).toHaveLength(16);
  });

  it('has a light token equal to each canvas colour, and a night token, for all nine colours', () => {
    expect(Object.keys(doodleColourTokens)).toHaveLength(9);
    expect(checkColourMap(lightTokens, nightTokens)).toEqual([]);
  });

  it('gives every doodle colour a different value at night, so the drawings change with the theme', () => {
    for (const token of Object.values(doodleColourTokens)) {
      expect(nightTokens.get(token)).not.toBe(lightTokens.get(token));
    }
  });
});

describe('rewriting a doodle', () => {
  it('swaps each colour for its token with the light value as the fallback', () => {
    const { svg, unknownColours } = tokeniseDoodle(canvasDoodle);

    expect(unknownColours).toEqual([]);
    expect(svg).toContain('<path d="M0 0" style="fill:var(--doodle-ink, #2a0e33)"/>');
    expect(svg).toContain('<path d="M1 1" style="fill:var(--doodle-blush, #f2a7b8)"/>');
    expect(findRawColours(svg, lightTokens)).toEqual([]);
  });

  it('changes nothing the second time', () => {
    const once = tokeniseDoodle(canvasDoodle).svg;

    expect(tokeniseDoodle(once).svg).toBe(once);
  });

  it('reports a colour that has no token and leaves it in place', () => {
    const { svg, unknownColours } = tokeniseDoodle(
      '<svg viewBox="-64 -64 128 128"><path fill="#123456" d="M0 0"/></svg>',
    );

    expect(unknownColours).toEqual(['#123456']);
    expect(svg).toContain('fill="#123456"');
  });

  it('tells a cover background apart from a doodle', () => {
    expect(isCoverBackground(coverBackground)).toBe(true);
    expect(isCoverBackground(canvasDoodle)).toBe(false);
  });
});

describe('checking a doodle', () => {
  it('flags a raw colour', () => {
    expect(findRawColours(canvasDoodle, lightTokens)).toEqual([
      'raw colour #2a0e33 has no token',
      'raw colour #f2a7b8 has no token',
    ]);
  });

  it('flags a fallback that no longer matches the light token', () => {
    const drifted = '<svg><path style="fill:var(--doodle-ink, #000000)"/></svg>';

    expect(findRawColours(drifted, lightTokens)).toEqual([
      'fallback #000000 for --doodle-ink should be its light value #2a0e33',
    ]);
  });

  it('flags a token that is not in tokens.css', () => {
    const unknown = '<svg><path style="fill:var(--doodle-mystery, #2a0e33)"/></svg>';

    expect(findRawColours(unknown, lightTokens)).toEqual([
      'uses --doodle-mystery, which is not in tokens.css',
    ]);
  });

  it('accepts fill="none", which is not a colour', () => {
    expect(findRawColours('<svg><path fill="none"/></svg>', lightTokens)).toEqual([]);
  });
});

describe('running over a folder', () => {
  it('rewrites the doodles, skips the covers and then passes its own check', () => {
    const folder = mkdtempSync(join(tmpdir(), 'doodles-'));
    writeFileSync(join(folder, 'cat.svg'), canvasDoodle);
    writeFileSync(join(folder, 'cover.svg'), coverBackground);

    const rewrite = runDoodleTokens('rewrite', folder, tokensCss);
    expect(rewrite.changed).toEqual(['cat.svg']);
    expect(rewrite.skippedCovers).toEqual(['cover.svg']);
    expect(rewrite.problems).toEqual([]);
    expect(readFileSync(join(folder, 'cover.svg'), 'utf8')).toBe(coverBackground);

    expect(runDoodleTokens('check', folder, tokensCss).problems).toEqual([]);
    expect(runDoodleTokens('rewrite', folder, tokensCss).changed).toEqual([]);
  });

  it('refuses to write a doodle with a colour that has no token', () => {
    const folder = mkdtempSync(join(tmpdir(), 'doodles-'));
    const odd = '<svg viewBox="-64 -64 128 128"><path fill="#123456" d="M0 0"/></svg>';
    writeFileSync(join(folder, 'odd.svg'), odd);

    const result = runDoodleTokens('rewrite', folder, tokensCss);

    expect(result.problems).toEqual(['odd.svg: colour #123456 has no token; add it to tokens.css']);
    expect(readFileSync(join(folder, 'odd.svg'), 'utf8')).toBe(odd);
  });

  it('stops before touching any file when the map and tokens.css disagree', () => {
    const folder = mkdtempSync(join(tmpdir(), 'doodles-'));
    writeFileSync(join(folder, 'cat.svg'), canvasDoodle);
    const wrongTokens = tokensCss.replace('--doodle-ink: #2a0e33;', '--doodle-ink: #000000;');

    const result = runDoodleTokens('rewrite', folder, wrongTokens);

    expect(result.problems).toEqual([
      'tokens.css: --doodle-ink is #000000 in light mode, the doodles use #2a0e33',
    ]);
    expect(readFileSync(join(folder, 'cat.svg'), 'utf8')).toBe(canvasDoodle);
  });
});
