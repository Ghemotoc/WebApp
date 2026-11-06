/**
 * Tests for the visual compare tool (LOOK-0): which routes it picks, which board render each
 * width is compared with, and the file name each picture gets.
 */
import { describe, expect, it } from 'vitest';

import routeFile from './visual-compare.routes.json';
import {
  compareWidths,
  pickRoutes,
  planShots,
  shotFileName,
  type CompareRoute,
} from './visual-compare';

const home: CompareRoute = { route: '/', board: 'Website-Home', signedIn: null };
const discover: CompareRoute = { route: '/discover', board: 'Discover', signedIn: 'adult_writer' };

describe('the visual compare tool', () => {
  it('compares every route when none is named', () => {
    expect(pickRoutes([home, discover], [])).toEqual([home, discover]);
  });

  it('keeps only the routes named, in file order', () => {
    expect(pickRoutes([home, discover], ['/discover', '/'])).toEqual([home, discover]);
  });

  it('refuses a route that is not in the file, so a typo never gives an empty run', () => {
    expect(() => pickRoutes([home], ['/discvoer'])).toThrow('/discvoer');
  });

  it('checks each route at 1440, 768 and 390 px, with the phone board only at 390', () => {
    const shots = planShots([home]);

    expect(shots.map((shot) => [shot.width, shot.renderFolder])).toEqual([
      [1440, 'desktop'],
      [768, 'desktop'],
      [390, 'phone'],
    ]);
  });

  it('names each picture by width and board', () => {
    const [firstShot] = planShots([discover]);

    expect(firstShot && shotFileName(firstShot)).toBe('1440-Discover.jpg');
    expect(compareWidths).toEqual([1440, 768, 390]);
  });

  it('lists only boards that have both a desktop and a phone render', async () => {
    const { existsSync } = await import('node:fs');
    const routes = (routeFile as { routes: CompareRoute[] }).routes;
    const missing = routes.flatMap((entry) =>
      ['desktop', 'phone']
        .map((folder) => `design/renders/${folder}/${entry.board}.jpg`)
        .filter((path) => !existsSync(path)),
    );

    expect(missing).toEqual([]);
  });
});
