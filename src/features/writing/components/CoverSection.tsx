/**
 * CoverSection: "Cover": draw a cover, or skip it for the automatic one (story S1-E3-01; the
 * automatic cover drawn from the story's ID and the "Right now: …" line, S1-E3-13; board
 * NewStory 4.2, section 3).
 *
 * What it shows: the preview (180 × 288), "Pick a background. We add your title and pen name.",
 * the automatic-cover box, the 16 tiles, the colour swatches and the rights line.
 * Uploads (S1-E10-05): while the `picture_uploads` flag is on, Story settings shows "Upload a
 * picture" (CoverUploadField): the picture is checked before readers see it. A new story shows a
 * line saying the upload is in the story's settings once it is saved, because the database lets
 * an upload into a story's folder only once the story exists. Canva is S1-E3-12.
 * Who uses it: NewStoryPage and StorySettingsPage. What it calls: useFeatureFlags,
 * CoverUploadField, DrawnCoverPicker, CoverColourSwatches, DrawnCover.
 */
import { useTranslation } from 'react-i18next';

import {
  coverAccentPart,
  coverDesignByKey,
  defaultChoiceFor,
  type CoverDesignKey,
  type DrawnCoverChoice,
} from '@/components/covers/coverDesigns';
import { automaticCoverFor } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { Button } from '@/components/ui/Button';
import { Doodle } from '@/components/ui/Doodle';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';
import { CoverUploadField } from '@/features/pictures/components/CoverUploadField';
import type { StoryCoverChoice } from '@/schemas/story';

import { CoverColourSwatches } from './CoverColourSwatches';
import { DrawnCoverPicker } from './DrawnCoverPicker';
import { FormSection } from './FormSection';

/** What the section needs. */
export interface CoverSectionProps {
  /** The story's ID, made by the form, so the automatic cover is known (S1-E3-13). */
  storyId: string;
  title: string;
  penName: string;
  cover: StoryCoverChoice;
  onChange: (cover: StoryCoverChoice) => void;
  /** True in Story settings, where the story exists and a picture can be uploaded (S1-E10-05). */
  canUpload?: boolean;
}

/**
 * The upload part: the field in Story settings, a line on a new story, nothing while uploads are
 * off (S1-E10-05).
 *
 * @returns the part, or null
 */
function UploadPart({
  storyId,
  cover,
  canUpload,
  onChange,
}: Pick<CoverSectionProps, 'storyId' | 'cover' | 'onChange'> & { canUpload: boolean }) {
  const { t } = useTranslation('writing');
  const { isOn } = useFeatureFlags();
  if (!isOn('picture_uploads', false)) return null;
  if (!canUpload) return <p className="m-0 text-[13px] text-meta">{t('cover.uploadLater')}</p>;
  return (
    <div className="flex flex-col gap-2">
      {cover.kind === 'upload' && (
        <p className="m-0 text-sm text-body">{t('cover.uploadChosen')}</p>
      )}
      <CoverUploadField
        storyId={storyId}
        onUploaded={(path) => onChange({ kind: 'upload', tallPath: path })}
      />
    </div>
  );
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
 * The automatic-cover box: "Skip this and we’ll give your story one of these covers
 * automatically…", the design the story would get, and the way back to it (S1-E3-13).
 *
 * @returns the box
 */
function AutomaticCoverBox({
  automaticDesign,
  isAutomatic,
  onUseAutomatic,
}: {
  automaticDesign: CoverDesignKey;
  isAutomatic: boolean;
  onUseAutomatic: () => void;
}) {
  const { t } = useTranslation('writing');
  return (
    <div className="flex flex-col gap-2 rounded-[14px] bg-panel p-4 text-sm text-body">
      <p className="m-0">{t('cover.automatic.intro')}</p>
      <p className="m-0 text-[13px] text-meta">
        {isAutomatic
          ? t('cover.automatic.current', { design: t(`cover.designNames.${automaticDesign}`) })
          : t('cover.automatic.chosen')}
      </p>
      {!isAutomatic && (
        <div>
          <Button variant="secondary" onClick={onUseAutomatic}>
            {t('cover.automatic.use')}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Renders the section.
 *
 * @returns the fieldset
 */
export function CoverSection({
  storyId,
  title,
  penName,
  cover,
  onChange,
  canUpload = false,
}: CoverSectionProps) {
  const { t } = useTranslation('writing');
  const drawnChoice = cover.kind === 'drawn' ? cover : null;
  // While the cover is automatic, the preview shows the design the story gets from its ID
  // (S1-E3-13), so "Skip this" is never a surprise.
  const automaticChoice = automaticCoverFor(storyId);
  const previewChoice = drawnChoice ?? automaticChoice;
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
      <UploadPart storyId={storyId} cover={cover} canUpload={canUpload} onChange={onChange} />
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="flex flex-col gap-2">
          <Eyebrow>{t('cover.preview')}</Eyebrow>
          <CoverPreview choice={previewChoice} title={shownTitle} penName={penName} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <p className="m-0 text-sm font-semibold text-ink">{t('cover.pickBackground')}</p>
          <AutomaticCoverBox
            automaticDesign={automaticChoice.design}
            isAutomatic={cover.kind === 'automatic'}
            onUseAutomatic={() => onChange({ kind: 'automatic' })}
          />
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
