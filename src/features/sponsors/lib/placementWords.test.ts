/**
 * Unit tests for the Placements helpers (bundle SPONSORS-e2; story S1-E12-05).
 */
import { describe, expect, it } from 'vitest';

import type { StaffCampaign } from '@/schemas/sponsors';

import {
  bookableCampaigns,
  emptyBookingFields,
  houseAdFieldsOf,
  romanianToday,
  shownState,
} from './placementWords';

/** A campaign with only the fields these helpers read. */
function campaign(overrides: Partial<StaffCampaign>): StaffCampaign {
  return {
    id: 'c1',
    state: 'approved',
    placement: 'discover_banner',
    starts_on: '2027-02-01',
    ends_on: '2027-02-28',
    ...overrides,
  } as StaffCampaign;
}

describe('shownState', () => {
  it('shows a free wide slot as the ad network while the preview is on', () => {
    expect(shownState({ week_start: '2027-02-01', state: 'free' }, 'wide', true)).toBe('network');
  });

  it('keeps a free card free, because the network fills only wide slots', () => {
    expect(shownState({ week_start: '2027-02-01', state: 'free' }, 'list_card', true)).toBe('free');
  });

  it('never covers a booking with the preview', () => {
    expect(shownState({ week_start: '2027-02-01', state: 'booked' }, 'wide', true)).toBe('booked');
  });
});

describe('bookableCampaigns', () => {
  it('offers approved banners that haven’t ended, never credits, drafts or past campaigns', () => {
    const campaigns = [
      campaign({ id: 'banner' }),
      campaign({ id: 'credit', placement: 'category' }),
      campaign({ id: 'draft', state: 'draft' }),
      campaign({ id: 'past', ends_on: '2027-01-31' }),
    ];
    expect(bookableCampaigns(campaigns, '2027-02-10').map((each) => each.id)).toEqual(['banner']);
  });
});

describe('emptyBookingFields', () => {
  it('starts on the campaign’s own dates, from today at the earliest, on any page', () => {
    expect(emptyBookingFields(campaign({}), 'discover_wide', '2027-02-10')).toEqual({
      slot_key: 'discover_wide',
      starts_on: '2027-02-10',
      ends_on: '2027-02-28',
      categories: [],
      tags: [],
      languages: [],
    });
  });
});

describe('houseAdFieldsOf', () => {
  it('turns "any slot" into an empty choice and leaves the ID out', () => {
    const fields = houseAdFieldsOf(
      {
        id: 'h1',
        title_ro: 'Concurs',
        title_en: 'Contest',
        text_ro: '',
        text_en: '',
        link_path: '/c/contest',
        slot_key: null,
        starts_on: '2027-02-01',
        ends_on: '2027-02-07',
      },
      '2027-02-01',
    );
    expect(fields.slot_key).toBe('');
    expect(fields).not.toHaveProperty('id');
  });
});

describe('romanianToday', () => {
  it('reads the day in Romanian time, which is already the next day at 23:30 UTC', () => {
    expect(romanianToday(new Date('2027-02-10T23:30:00Z'))).toBe('2027-02-11');
  });
});
