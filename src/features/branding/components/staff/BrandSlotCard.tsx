/**
 * BrandSlotCard: one brand slot on Staff › Website › Branding: where it shows, its preview, the
 * state of a new picture's check, "Upload a picture" and "Use the default" (bundle BRAND-1,
 * part a).
 *
 * The upload goes through the picture check like every other (CLAUDE.md rule 19) and a moderator
 * approves it, because the logo is on every screen for every age. Until then the app keeps
 * showing the previous picture or the default, and the card says so.
 * Who shows it: BrandingTab, once per slot. What it calls: useBrandUpload(), useBrandClear() and
 * PictureUploadField from the pictures feature.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PictureUploadField } from '@/features/pictures/components/PictureUploadField';
import { uploadOutcomeOf } from '@/features/pictures/hooks/usePictureUpload';

import type { BrandSlot, StaffBrandSlot } from '../../api/brandAssets';
import { useBrandClear, useBrandUpload } from '../../hooks/useBrandSlots';

import { BrandSlotPreview } from './BrandSlotPreview';

/** What the card needs. */
interface BrandSlotCardProps {
  slot: BrandSlot;
  /** The slot's picture, or undefined when it shows the default. */
  filled: StaffBrandSlot | undefined;
}

/**
 * The line under the preview: which picture the app shows now.
 *
 * @returns the state in words
 */
function SlotState({ filled }: { filled: StaffBrandSlot | undefined }) {
  const { t } = useTranslation('websiteAdmin');
  let state: string = filled === undefined ? 'default' : filled.view.state;
  // A new picture that isn't ready yet: say whether the earlier picture or the default shows.
  if (filled !== undefined && state !== 'visible') {
    state = filled.showsEarlier ? `${state}_earlier` : `${state}_default`;
  }
  return <p className="m-0 text-sm text-body">{t(`branding.states.${state}`)}</p>;
}

/**
 * Renders the card.
 *
 * @returns the slot's section
 */
export function BrandSlotCard({ slot, filled }: BrandSlotCardProps) {
  const { t } = useTranslation('websiteAdmin');
  const upload = useBrandUpload(slot);
  const clear = useBrandClear(slot);
  const headingId = `brand-slot-${slot}`;
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
    >
      <h3 id={headingId} className="m-0 font-heading text-lg font-bold text-heading">
        {t(`branding.slots.${slot}.title`)}
      </h3>
      <p className="m-0 text-sm text-body">{t(`branding.slots.${slot}.where`)}</p>
      <BrandSlotPreview slot={slot} uploadedUrl={filled?.view.url ?? null} />
      <SlotState filled={filled} />
      <PictureUploadField
        label={t('branding.upload')}
        hint={t('branding.hint')}
        isUploading={upload.isPending}
        outcome={uploadOutcomeOf(upload.data?.status, upload.error)}
        onPick={(file) => upload.mutate(file)}
      />
      {filled !== undefined && (
        <div>
          <Button variant="secondary" disabled={clear.isPending} onClick={() => clear.mutate()}>
            {t('branding.useDefault')}
          </Button>
        </div>
      )}
      {clear.isError && <Notice tone="error">{t('failures.unreachable')}</Notice>}
    </section>
  );
}
