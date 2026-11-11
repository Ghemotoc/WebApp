/**
 * ListBackgroundEditor: "Editing Poetry", the card where an admin picks a genre or tag page's band
 * colour, with a preview of the band (bundle G12b; the StaffWebsite board's editing card).
 *
 * The six colours are the band gradients the genre pages already use; each carries white text at
 * 4.5:1 or more (contrast-pairs.ts), so the board's contrast lines are true for every choice and
 * the card says so once instead of measuring. The board's "Upload a drawing" waits for its own
 * part (noted in the PR).
 * Who shows it: ListBackgroundsTab. What it calls: ChoiceChips, accentDeepBandClasses (the same
 * band the page draws) and the save and clear hooks.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import type { PillTone } from '@/components/ui/InfoPill';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { accentDeepBandClasses } from '@/features/discovery/lib/categoryAccents';
import { cn } from '@/lib/utils';

import { bandPalettes, type BackgroundPlace } from '../../api/staff/listPageBackgrounds';

/** What the editor needs. */
interface ListBackgroundEditorProps {
  place: BackgroundPlace;
  /** The page's name as visitors see it ("Poetry", "#Fantasy"). */
  pageName: string;
  /** The colour chosen now for this market, or the page's default. */
  startTone: PillTone;
  hasChoice: boolean;
  isBusy: boolean;
  onSave: (tone: PillTone) => void;
  onClear: () => void;
  onCancel: () => void;
}

/**
 * The band as the page draws it, at a smaller size.
 *
 * @returns the preview
 */
function BandPreview({ tone, pageName }: { tone: PillTone; pageName: string }) {
  const { t } = useTranslation('websiteAdmin');
  return (
    <div
      className={cn(
        'genre-band relative flex flex-col gap-2 overflow-hidden rounded-[28px] p-6',
        accentDeepBandClasses[tone],
      )}
    >
      <Eyebrow>{t('listBackgrounds.previewEyebrow')}</Eyebrow>
      <p className="m-0 font-heading text-[32px] leading-none font-bold text-heading">{pageName}</p>
    </div>
  );
}

/**
 * Renders the card.
 *
 * @returns the editing card
 */
export function ListBackgroundEditor(props: ListBackgroundEditorProps) {
  const { place, pageName, startTone, hasChoice, isBusy, onSave, onClear, onCancel } = props;
  const { t } = useTranslation('websiteAdmin');
  const [tone, setTone] = useState<PillTone>(startTone);
  const options = bandPalettes.map((palette) => ({
    value: palette,
    label: t(`listBackgrounds.palettes.${palette}`),
    dotColour: `var(--band-${palette}-from)`,
  }));
  return (
    <section
      aria-labelledby="list-background-editor-heading"
      className="flex flex-col gap-5 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="list-background-editor-heading"
        className="m-0 font-heading text-xl font-bold text-heading"
      >
        {t('listBackgrounds.editing', { name: pageName })}
      </h2>
      <ChoiceChips
        label={t('listBackgrounds.colour')}
        isLabelVisible
        options={options}
        value={tone}
        onChange={(picked) => setTone(bandPalettes.find((palette) => palette === picked) ?? tone)}
        description={t('listBackgrounds.contrastNote')}
        descriptionId={`list-background-${place.kind}-note`}
      />
      <BandPreview tone={tone} pageName={pageName} />
      <p className="m-0 text-sm text-meta">{t('listBackgrounds.liveNote')}</p>
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('listBackgrounds.cancel')}
        </Button>
        {hasChoice && (
          <Button type="button" variant="secondary" disabled={isBusy} onClick={onClear}>
            {t('listBackgrounds.useDefault')}
          </Button>
        )}
        <Button type="button" disabled={isBusy} onClick={() => onSave(tone)}>
          {t('listBackgrounds.save')}
        </Button>
      </div>
    </section>
  );
}
