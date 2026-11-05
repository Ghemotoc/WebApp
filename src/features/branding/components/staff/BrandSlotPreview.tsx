/**
 * BrandSlotPreview: how one brand slot looks today, on the page colour of its theme (bundle
 * BRAND-1, part a).
 *
 * It shows the uploaded picture when the staff member may see it (at any stage of its check, as
 * the uploader), otherwise the bundled default: the placeholder emblem, or the product name as
 * text for a logo. The tile uses the light or night page colour (--paper in
 * src/styles/tokens.css) whatever theme the staff member uses, as the seasonal doodle picker does.
 * Who shows it: BrandSlotCard. What it calls: nothing; it draws what it is given.
 */
import { useTranslation } from 'react-i18next';

import { brand } from '@/config/brand';
import { cn } from '@/lib/utils';

import type { BrandSlot } from '../../api/brandAssets';
import { defaultBrandPicture, isNightSlot } from '../../lib/brandDefaults';

/** What the preview needs. */
interface BrandSlotPreviewProps {
  slot: BrandSlot;
  /** The uploaded picture's signed address, or null to show the default. */
  uploadedUrl: string | null;
}

/**
 * The default for a slot: the bundled emblem, or the product name as text.
 *
 * @returns the picture or the text
 */
function DefaultLook({ slot }: { slot: BrandSlot }) {
  const { t } = useTranslation('websiteAdmin');
  const source = defaultBrandPicture[slot];
  if (source === null) {
    // The text wordmark the top bar shows (TopBar), in the theme's heading colour.
    return (
      <span
        className={cn(
          'font-heading text-[22px] font-extrabold tracking-[-0.01em]',
          isNightSlot(slot) ? 'text-[#E9DDF0]' : 'text-[#481C5F]',
        )}
      >
        {brand.productName}
      </span>
    );
  }
  return <img src={source} alt={t('branding.defaultAlt')} className="h-16 w-auto" />;
}

/**
 * Renders the tile.
 *
 * @returns the preview
 */
export function BrandSlotPreview({ slot, uploadedUrl }: BrandSlotPreviewProps) {
  const { t } = useTranslation('websiteAdmin');
  return (
    <div
      className={cn(
        'flex min-h-24 items-center justify-center rounded-lg border border-control-border p-4',
        isNightSlot(slot) ? 'bg-[#1E0F24]' : 'bg-[#FAF8F5]',
      )}
    >
      {uploadedUrl === null ? (
        <DefaultLook slot={slot} />
      ) : (
        <img
          src={uploadedUrl}
          alt={t('branding.uploadedAlt', { slot: t(`branding.slots.${slot}.title`) })}
          className="max-h-16 w-auto max-w-full"
        />
      )}
    </div>
  );
}
