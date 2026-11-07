/**
 * Unit tests for reading the admin front page's numbers (bundle DASH-1).
 *
 * Who runs it: `npm test`.
 * What it proves: each number the server sends becomes one tile linking to its area, an area the
 * server leaves out gets no tile, and only overdue work and failures are marked as warnings.
 */
import { describe, expect, it } from 'vitest';

import { dashboardTilesFromAnswer } from './staffDashboard';

describe('dashboardTilesFromAnswer', () => {
  it('shows a moderator the moderation numbers, with overdue reports marked', () => {
    const tiles = dashboardTilesFromAnswer({
      moderation: { waiting: 4, overdue: 1, pictures: 0 },
      appeals: { open: 2 },
    });
    expect(tiles.map((tile) => tile.key)).toEqual([
      'moderation.waiting',
      'moderation.overdue',
      'moderation.pictures',
      'appeals.open',
    ]);
    expect(tiles[1]).toEqual({
      key: 'moderation.overdue',
      count: 1,
      href: '/staff/moderation',
      isWarning: true,
    });
    expect(tiles[0]?.isWarning).toBe(false);
  });

  it('gives no tile to an area the server left out', () => {
    const tiles = dashboardTilesFromAnswer({ supportTickets: { open: 3 } });
    expect(tiles).toEqual([
      { key: 'supportTickets.open', count: 3, href: '/staff/support', isWarning: false },
    ]);
  });

  it('marks nothing when nothing is overdue or failing', () => {
    const tiles = dashboardTilesFromAnswer({
      dataRequests: { open: 1, overdue: 0 },
      logs: { failedCalls: 0, crashes: 0 },
    });
    expect(tiles.some((tile) => tile.isWarning)).toBe(false);
  });

  it('skips a value that is not a number and an answer that is not an object', () => {
    expect(dashboardTilesFromAnswer({ moderation: { waiting: '4' } })).toEqual([]);
    expect(dashboardTilesFromAnswer(null)).toEqual([]);
    expect(dashboardTilesFromAnswer([1, 2])).toEqual([]);
  });
});
