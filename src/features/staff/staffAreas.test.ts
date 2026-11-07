/**
 * Unit tests for the admin site's map and its side menu groups (bundle DASH-1).
 *
 * Who runs it: `npm test`.
 * What it proves: every page sits in one of the five groups, the page list is already in group
 * order (so the menu, the home page cards and the footer agree), and a person sees only the
 * groups that hold a page they may open.
 */
import { describe, expect, it } from 'vitest';

import { groupStaffPages, pagesForAreas, staffAreaPages, staffMenuGroups } from './staffAreas';

describe('the staff side menu groups', () => {
  it('lists the pages in the order of their groups', () => {
    const groupPositions = staffAreaPages.map((page) => staffMenuGroups.indexOf(page.group));
    const sorted = [...groupPositions].sort((first, second) => first - second);
    expect(groupPositions).toEqual(sorted);
  });

  it('shows the owner all five groups, Safety first and System last', () => {
    const everyArea = staffAreaPages.map((page) => page.area);
    const groups = groupStaffPages(pagesForAreas(everyArea));
    expect(groups.map((entry) => entry.group)).toEqual([
      'safety',
      'people',
      'content',
      'website',
      'system',
    ]);
  });

  it('leaves out a group with no page the person may open', () => {
    const groups = groupStaffPages(pagesForAreas(['data_requests', 'support_tickets', 'stories']));
    expect(groups.map((entry) => entry.group)).toEqual(['people', 'content']);
    expect(groups[0]?.pages.map((page) => page.href)).toEqual([
      '/staff/support',
      '/staff/data-requests',
    ]);
  });

  it('shows no group to a role with no area', () => {
    expect(groupStaffPages(pagesForAreas([]))).toEqual([]);
  });
});
