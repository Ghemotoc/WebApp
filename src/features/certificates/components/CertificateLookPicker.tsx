/**
 * CertificateLookPicker: the "Look" section of the teacher's certificates form: the colour, the
 * faint pattern behind the text and what the seal shows (bundle G13a and G13b; board G14, bundle
 * BOOKS-8, part 8c).
 *
 * The colours are a group of real radio buttons drawn as swatches, so arrow keys move between them
 * and a screen reader names each one ("Sea glass"); the chosen one carries a check mark as well as
 * its ring, so the choice never rests on colour alone (DoD pill system). The pattern is a
 * drop-down, as G14 draws it, with the same names as the covers. The seal choice is
 * CertificateSealChoices. The preview of what the teacher signs is CertificateLookPreview, beside
 * the form.
 * Who shows it: ClassResultsForm and CompetitionCertificatesForm.
 * What it calls: CertificateSealChoices and the look helpers in lib/certificateLook.ts.
 */
import { CheckIcon } from '@/components/icons/CheckIcon';
import { Select } from '@/components/ui/Select';

import {
  certificateColours,
  certificateFrameBackground,
  certificatePatternOf,
  certificatePatterns,
  type CertificateLook,
} from '../lib/certificateLook';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

import { CertificateSealChoices } from './CertificateSealChoices';

/** A colour swatch: a 44 px circle with a visible focus ring on the hidden radio's label. */
const swatchClasses =
  'relative flex size-11 cursor-pointer items-center justify-center rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus-ring) has-[:focus-visible]:outline-solid';

/** What the picker needs. */
interface CertificateLookPickerProps {
  look: CertificateLook;
  onChange: (look: CertificateLook) => void;
}

/**
 * The colour swatches.
 *
 * @returns the radio group
 */
function ColourChoices({ look, onChange }: CertificateLookPickerProps) {
  const { t } = useCertificatesTranslation();
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 type-label text-ink">{t('look.colour')}</legend>
      <div className="flex flex-wrap gap-2">
        {certificateColours.map((colour) => (
          <label
            key={colour}
            className={swatchClasses}
            style={{ background: certificateFrameBackground(colour) }}
          >
            <input
              type="radio"
              name="certificate-colour"
              value={colour}
              checked={look.colour === colour}
              onChange={() => onChange({ ...look, colour })}
              className="sr-only"
            />
            <span className="sr-only">{t(`look.colours.${colour}`)}</span>
            {look.colour === colour && <CheckIcon size={16} className="text-white" />}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * The pattern drop-down with its hint.
 *
 * @returns the field
 */
function PatternChoice({ look, onChange }: CertificateLookPickerProps) {
  const { t } = useCertificatesTranslation();
  const options = certificatePatterns.map((pattern) => ({
    value: pattern,
    label: t(`look.patterns.${pattern}`),
  }));
  return (
    <div className="flex flex-col gap-2">
      <Select
        id="certificate-pattern"
        label={t('look.pattern')}
        isLabelAbove
        placement="form"
        options={options}
        value={look.pattern}
        descriptionId="certificate-pattern-hint"
        onChange={(value) => onChange({ ...look, pattern: certificatePatternOf(value) })}
      />
      <p id="certificate-pattern-hint" className="m-0 max-w-[480px] type-meta text-ink-muted">
        {t('look.patternHint')}
      </p>
    </div>
  );
}

/**
 * Renders the section.
 *
 * @param props.look - the look chosen so far
 * @param props.onChange - called with the new look
 * @param props.space - the class's address and ID, for its crest
 * @returns the section
 */
export function CertificateLookPicker({
  look,
  onChange,
  space,
}: CertificateLookPickerProps & { space: { slug: string; spaceId: string } }) {
  const { t } = useCertificatesTranslation();
  return (
    <section
      aria-labelledby="certificate-look-heading"
      className="flex flex-col gap-4 border-t border-hairline pt-6"
    >
      <h2 id="certificate-look-heading" className="m-0 type-heading text-ink-heading">
        {t('look.title')}
      </h2>
      <ColourChoices look={look} onChange={onChange} />
      <PatternChoice look={look} onChange={onChange} />
      <CertificateSealChoices look={look} onChange={onChange} space={space} />
    </section>
  );
}
