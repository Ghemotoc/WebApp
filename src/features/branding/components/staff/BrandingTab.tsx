/**
 * BrandingTab: Staff › Website › Branding, where the owner and admins upload the logo and the
 * emblem for the light and the night theme (bundle BRAND-1, part a; Robert, 4 Nov 2026,
 * 14:25 UTC). The emblem is also the browser tab icon.
 *
 * What it shows: a short explanation, then one card per slot (BrandSlotCard). An empty slot shows
 * the bundled default: Nicole's cat for the emblem, the product name as text for the logo. Every
 * change is in the audit log (website.brand_asset_set and website.brand_asset_cleared). Plain
 * staff components, no doodles.
 * Who shows it: WebsiteAdminPage (/staff/website/branding). What it calls: useBrandSlots().
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';

import { brandSlots } from '../../api/brandAssets';
import { useBrandSlots } from '../../hooks/useBrandSlots';

import { BrandSlotCard } from './BrandSlotCard';

/**
 * Renders the tab.
 *
 * @returns the branding area
 */
export function BrandingTab() {
  const { t } = useTranslation('websiteAdmin');
  const slots = useBrandSlots();
  return (
    <div className="flex flex-col gap-4">
      <h2 className="m-0 font-heading text-2xl font-bold text-heading">{t('branding.heading')}</h2>
      <p className="m-0 max-w-[760px] text-body">{t('branding.intro')}</p>
      {slots.isError && <Notice tone="error">{t('failures.unreachable')}</Notice>}
      {slots.isSuccess && (
        <div className="grid gap-4 md:grid-cols-2">
          {brandSlots.map((slot) => (
            <BrandSlotCard key={slot} slot={slot} filled={slots.data[slot]} />
          ))}
        </div>
      )}
    </div>
  );
}
