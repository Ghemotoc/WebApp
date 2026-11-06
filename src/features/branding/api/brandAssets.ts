/**
 * brandAssets: reads and changes the logos and emblems staff upload (bundle BRAND-1, part a;
 * Robert, 4 Nov 2026, 14:25 UTC).
 *
 * There are four slots (the database's brand_asset_slot): a logo and an emblem, each for the
 * light and the night theme. The emblem is also the browser tab icon. An empty slot means the
 * app's bundled default (the curled cat logo, LOGO-1).
 * Who calls it: useBrandSlots() on the staff page (Staff › Website › Branding).
 * What it calls next: the database functions admin_brand_assets(), admin_set_brand_asset() and
 * admin_clear_brand_asset() in migration 20270128100002, and pictureViewsFromJson() for the
 * signed picture addresses.
 */
import type { AppSupabaseClient } from '@/lib/supabase';
import type { Enums } from '@/lib/database.types';
import { pictureViewsFromJson, type PictureView } from '@/features/pictures/api/pictures';
import { websiteErrorFrom } from '@/features/website/api/websiteContentStore';

/** One of the four brand slots, generated from the database enum. */
export type BrandSlot = Enums<'brand_asset_slot'>;

/** The slots in the order the staff page shows them: logos first, light before night. */
export const brandSlots: readonly BrandSlot[] = [
  'logo_light',
  'logo_dark',
  'emblem_light',
  'emblem_dark',
];

/** A filled slot on the staff page: the newest picture's ID and how far its check has got. */
export interface StaffBrandSlot {
  pictureId: string;
  view: PictureView;
  /** True while the newest picture waits and the app still shows the slot's earlier one. */
  showsEarlier: boolean;
}

/**
 * Reads the filled slots for the staff page.
 *
 * @param client - the staff member's Supabase client
 * @returns the filled slots by name; an empty slot is left out
 * @throws WebsiteContentError (not_allowed for anyone but owner and admin)
 */
export async function fetchStaffBrandSlots(
  client: AppSupabaseClient,
): Promise<Partial<Record<BrandSlot, StaffBrandSlot>>> {
  // Step 1: the slots with each picture's state, from the database.
  const { data, error } = await client.rpc('admin_brand_assets');
  if (error) throw websiteErrorFrom(error);
  // Step 2: the signed addresses, keyed by slot (pictureViewsFromJson reads state, bucket, path).
  const views = await pictureViewsFromJson(client, data);
  // Step 3: put each picture's ID and fallback flag next to its view.
  const slots: Partial<Record<BrandSlot, StaffBrandSlot>> = {};
  for (const slot of brandSlots) {
    const view = views[slot];
    const entry = slotEntryIn(data, slot);
    if (view !== undefined && entry !== null) slots[slot] = { ...entry, view };
  }
  return slots;
}

/**
 * The picture ID and fallback flag the database put in one slot's entry.
 *
 * @param data - the answer from admin_brand_assets()
 * @param slot - the slot
 * @returns the two values, or null when the slot is empty or the answer has an unexpected shape
 */
function slotEntryIn(
  data: unknown,
  slot: BrandSlot,
): { pictureId: string; showsEarlier: boolean } | null {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return null;
  const entry: unknown = (data as Record<string, unknown>)[slot];
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const fields = entry as Record<string, unknown>;
  if (typeof fields.picture_id !== 'string') return null;
  return { pictureId: fields.picture_id, showsEarlier: fields.shows_earlier === true };
}

/**
 * Puts an uploaded picture in a slot. The app goes on showing the previous picture, or the
 * default, until a moderator has approved the new one.
 *
 * @param client - the staff member's Supabase client
 * @param slot - the slot the picture was uploaded for
 * @param pictureId - the ID uploadBrandPicture() returned
 * @throws WebsiteContentError (not_allowed; invalid when the picture belongs to another slot)
 */
export async function setBrandAsset(
  client: AppSupabaseClient,
  slot: BrandSlot,
  pictureId: string,
): Promise<void> {
  const { error } = await client.rpc('admin_set_brand_asset', {
    target_slot: slot,
    target_picture_id: pictureId,
  });
  if (error) throw websiteErrorFrom(error);
}

/**
 * Empties a slot, so the app shows its bundled default again.
 *
 * @param client - the staff member's Supabase client
 * @param slot - the slot
 * @throws WebsiteContentError (not_allowed for anyone but owner and admin)
 */
export async function clearBrandAsset(client: AppSupabaseClient, slot: BrandSlot): Promise<void> {
  const { error } = await client.rpc('admin_clear_brand_asset', { target_slot: slot });
  if (error) throw websiteErrorFrom(error);
}
