/**
 * Small helpers for Staff › Sponsors › Placements: what a grid cell shows, which campaigns can be
 * booked and the empty forms (story S1-E12-05; bundle SPONSORS-e2).
 *
 * Who calls them: the components in components/staff/placements/. They call nothing; the words
 * are in the ro and en sponsors.json locale files.
 */
import type {
  BookingFields,
  HouseAd,
  HouseAdFields,
  PlacementSlot,
  PlacementWeek,
} from '@/schemas/adPlacements';
import type { StaffCampaign } from '@/schemas/sponsors';

/**
 * What a cell shows, once the preview is applied: a free wide slot reads "Ad network" while the
 * preview is on, because that is what the network would fill (S1-E12-04 fills only wide slots).
 *
 * @param week - the server's answer for the week
 * @param format - the slot's format
 * @param isPreviewOn - true while "Preview with the ad network on" is pressed
 * @returns the state to draw
 */
export function shownState(
  week: PlacementWeek,
  format: PlacementSlot['format'],
  isPreviewOn: boolean,
): PlacementWeek['state'] {
  if (week.state === 'free' && isPreviewOn && format === 'wide') return 'network';
  return week.state;
}

/**
 * The campaigns the booking form offers: approved banners and featured slots that haven't ended.
 * "Sponsored by" credits never go in a slot, and the server refuses the rest anyway.
 *
 * @param campaigns - every campaign
 * @param today - today as YYYY-MM-DD
 * @returns the bookable campaigns, in the order given
 */
export function bookableCampaigns(campaigns: StaffCampaign[], today: string): StaffCampaign[] {
  return campaigns.filter(
    (campaign) =>
      campaign.state === 'approved' &&
      campaign.placement !== 'category' &&
      campaign.placement !== 'contest' &&
      campaign.ends_on !== null &&
      campaign.ends_on >= today,
  );
}

/**
 * Today as YYYY-MM-DD in Romanian time, the calendar bookings use.
 *
 * @param now - the moment to read (now unless a test gives one)
 * @returns the day
 */
export function romanianToday(now: Date = new Date()): string {
  // "en-CA" writes dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest' }).format(now);
}

/**
 * A new booking form for a campaign: its first slot and its own dates, from today at the
 * earliest, matching any page.
 *
 * @param campaign - the campaign, or undefined when none can be booked
 * @param firstSlotKey - the slot to start on
 * @param today - today as YYYY-MM-DD
 * @returns the form's values
 */
export function emptyBookingFields(
  campaign: StaffCampaign | undefined,
  firstSlotKey: string,
  today: string,
): BookingFields {
  const startsOn = campaign?.starts_on ?? today;
  return {
    slot_key: firstSlotKey,
    starts_on: startsOn > today ? startsOn : today,
    ends_on: campaign?.ends_on ?? today,
    categories: [],
    tags: [],
    languages: [],
  };
}

/**
 * The house ad form's values: empty for a new one, or the house ad's own.
 *
 * @param houseAd - the house ad to change, or null for a new one
 * @param today - today as YYYY-MM-DD
 * @returns the form's values; an empty slot_key means any slot
 */
export function houseAdFieldsOf(houseAd: HouseAd | null, today: string): HouseAdFields {
  if (houseAd === null) {
    return {
      title_ro: '',
      title_en: '',
      text_ro: '',
      text_en: '',
      link_path: '/',
      slot_key: '',
      starts_on: today,
      ends_on: today,
    };
  }
  // Every field but the ID, which travels separately.
  return {
    title_ro: houseAd.title_ro,
    title_en: houseAd.title_en,
    text_ro: houseAd.text_ro,
    text_en: houseAd.text_en,
    link_path: houseAd.link_path,
    slot_key: houseAd.slot_key ?? '',
    starts_on: houseAd.starts_on,
    ends_on: houseAd.ends_on,
  };
}
