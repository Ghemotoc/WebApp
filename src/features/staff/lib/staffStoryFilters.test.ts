/**
 * Unit tests for the Staff › Stories address helpers and the row reader (bundle ADMIN-2, part a;
 * story S1-E11-07). Who runs them: Vitest (npm test).
 */
import { describe, expect, it } from 'vitest';

import { staffStoryRowFrom } from '../api/staffStories';

import {
  staffStoryFiltersFrom,
  staffStoryPageFrom,
  staffStoryParamsFrom,
} from './staffStoryFilters';

describe('staff story filters in the address', () => {
  it('an empty address means every story on the first page', () => {
    const params = new URLSearchParams('');
    expect(staffStoryFiltersFrom(params)).toEqual({
      searchText: '',
      status: null,
      categorySlug: null,
      languageCode: null,
      rating: null,
      readableBy: null,
      onlyOpenReports: false,
      onlyMinorWriters: false,
    });
    expect(staffStoryPageFrom(params)).toBe(0);
  });

  it('filters written to the address read back the same, with pages shown from 1', () => {
    const filters = {
      searchText: 'inkwolf',
      status: 'hidden' as const,
      categorySlug: 'poetry',
      languageCode: 'ro',
      rating: '13_plus' as const,
      readableBy: 'class' as const,
      onlyOpenReports: true,
      onlyMinorWriters: true,
    };
    const params = new URLSearchParams(staffStoryParamsFrom(filters, 2));
    expect(params.get('page')).toBe('3');
    expect(staffStoryFiltersFrom(params)).toEqual(filters);
    expect(staffStoryPageFrom(params)).toBe(2);
  });

  it('an unknown status, rating or page in a hand-typed address is ignored', () => {
    const params = new URLSearchParams('status=deleted&rating=21_plus&read=app&page=-4');
    const filters = staffStoryFiltersFrom(params);
    expect(filters.status).toBeNull();
    expect(filters.rating).toBeNull();
    expect(filters.readableBy).toBeNull();
    expect(staffStoryPageFrom(params)).toBe(0);
  });
});

describe('a Stories row from the database', () => {
  it('reads the report counts and treats an unknown status as a draft', () => {
    const row = staffStoryRowFrom({
      id: 'story-1',
      title: 'Stația meteo',
      owner_user_id: 'user-1',
      owner_handle: 'adult_writer',
      owner_pen_name: null,
      owner_status: 'active',
      owner_is_minor: false,
      category_slug: 'fiction',
      language_code: 'ro',
      status: 'something new',
      readable_by: 'everyone',
      rating: 'all_ages',
      chapter_count: 4,
      updated_at: '2026-11-02T10:00:00Z',
      reports: { open: 2, closed: 7 },
    });
    expect(row.status).toBe('draft');
    expect(row.openReports).toBe(2);
    expect(row.closedReports).toBe(7);
    expect(row.chapterCount).toBe(4);
  });
});
