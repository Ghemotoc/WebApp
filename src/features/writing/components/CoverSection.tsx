/**
 * CoverSection: "Cover": draw a cover, or skip it for the automatic one (story S1-E3-01; the
 * automatic cover's own text and "Right now: …" line come with S1-E3-13; board NewStory 4.2,
 * section 3).
 *
 * What it shows: the preview (180 × 288), "Pick a background. We add your title and pen name.",
 * the automatic-cover box, the 16 tiles, the colour swatches and the rights line.
 * Decisions (Robert, 23 Oct 2026): no picture uploads in the demo. The board's "Upload a picture"
 * tab and the Canva button are not shown while the `picture_uploads` flag is off; the flag, the
 * bucket and its rules exist (supabase/migrations/…_s1_e3_01_covers_bucket.sql) and the upload
 * screen is its own story once the picture check (S1-E10-05) exists (docs/mocks.md). Canva is
 * S1-E3-12, after March.
 * Who uses it: NewStoryPage. What it calls: useFeatureFlags (to show the upload tab one day),
 * DrawnCoverPicker, CoverColourSwatches, DrawnCover.
 */
import { useTranslation } from 'react-i18next';

import {
  coverAccentPart,
  coverDesignByKey,
  defaultChoiceFor,
  type CoverDesignKey,
  type DrawnCoverChoice,
} from '@/components/covers/coverDesigns';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { Button } from '@/components/ui/Button';
import { Doodle } from '@/components/ui/Doodle';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';
import type { StoryCoverChoice } from '@/schemas/story';

import { CoverColourSwatches } from './CoverColourSwatches';
import { DrawnCoverPicker } from './DrawnCoverPicker';
import { FormSection } from './FormSection';

/** What the section needs. */
export interface CoverSectionProps {
  title: string;
  penName: string;
  cover: StoryCoverChoice;
  onChange: (cover: StoryCoverChoice) => void;
}

/**
 * The accessible description of the preview, for example "Cover preview: Waves, Sky background
 * with Violet pattern. Title Stația meteo, by lia.scrie."
 */
function usePreviewLabel(choice: DrawnCoverChoice, title: string, penName: string): string {
  const { t } = useTranslation('writing');
  const partKeys = {
    line: 'cover.partLine',
    band: 'cover.partBand',
    pattern: 'cover.partPattern',
  } as const;
  const part = t(partKeys[coverAccentPart(coverDesignByKey(choice.design).kind)]);
  return t('cover.previewLabel', {
    design: t(`cover.designNames.${choice.design}`),
    background: t(`cover.colourNames.${choice.background}`),
    accent: t(`cover.colourNames.${choice.accent}`),
    part,
    title,
    penName,
  });
}

/** The preview and its label. */
function CoverPreview({
  choice,
  title,
  penName,
}: {
  choice: DrawnCoverChoice;
  title: string;
  penName: string;
}) {
  const label = usePreviewLabel(choice, title, penName);
  return (
    <div className="flex flex-col gap-2" role="img" aria-label={label}>
      <DrawnCover
        title={title}
        penName={penName}
        choice={choice}
        size="preview"
        className="w-[180px]"
      />
    </div>
  );
}

/**
 * Renders the section.
 *
 * @returns the fieldset
 */
export function CoverSection({ title, penName, cover, onChange }: CoverSectionProps) {
  const { t } = useTranslation('writing');
  const { isOn } = useFeatureFlags();
  const drawnChoice = cover.kind === 'drawn' ? cover : null;
  // What the preview shows while the cover is still automatic: the first design's defaults.
  const previewChoice = drawnChoice ?? defaultChoiceFor('sky');
  const shownTitle = title.trim() === '' ? t('cover.untitled') : title;

  /** Picks a design, starting from its board colours. */
  function pickDesign(design: CoverDesignKey) {
    onChange({ kind: 'drawn', ...defaultChoiceFor(design) });
  }

  return (
    <FormSection
      legend={t('cover.heading')}
      decoration={
        <Doodle
          name="rainbow"
          kind="widget"
          on="Cover"
          hideBelow="phone"
          className="absolute -top-6 right-6 w-20 -rotate-6"
        />
      }
    >
      {/* The board's "Draw a cover | Upload a picture" switch shows only once uploads are on. */}
      {isOn('picture_uploads', false) && (
        <p className="m-0 text-[13px] text-meta">{t('cover.upload')}</p>
      )}
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="flex flex-col gap-2">
          <Eyebrow>{t('cover.preview')}</Eyebrow>
          <CoverPreview choice={previewChoice} title={shownTitle} penName={penName} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <p className="m-0 text-sm font-semibold text-ink">{t('cover.pickBackground')}</p>
          <div className="flex flex-col gap-2 rounded-[14px] bg-panel p-4 text-sm text-body">
            <p className="m-0">{t('cover.automatic.intro')}</p>
            {drawnChoice !== null && (
              <div>
                <Button variant="secondary" onClick={() => onChange({ kind: 'automatic' })}>
                  {t('cover.automatic.use')}
                </Button>
              </div>
            )}
          </div>
          <DrawnCoverPicker choice={drawnChoice} onPick={pickDesign} />
        </div>
      </div>
      {drawnChoice !== null && (
        <CoverColourSwatches
          choice={drawnChoice}
          onChange={(choice) => onChange({ kind: 'drawn', ...choice })}
        />
      )}
      <p className="m-0 text-[13px] text-meta">{t('cover.drawnNote')}</p>
    </FormSection>
  );
}
