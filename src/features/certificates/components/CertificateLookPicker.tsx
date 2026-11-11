/**
 * CertificateLookPicker: the teacher's choice of how a programme's certificates look, its colour
 * and the faint pattern behind the text, with a small preview (bundle G13a; the canvas's
 * SpaceCertificates board, "Certificate look: colour and pattern").
 *
 * Each choice is a group of real radio buttons, so arrow keys move between them and a screen
 * reader names each one ("Sea glass", "Waves"); the swatch and the tile only show it. The selected
 * one carries a check mark as well as a ring, so the choice never rests on colour alone (DoD pill
 * system). The preview is the same frame and seal as the student's certificate, with the class's
 * name and the programme, so the teacher sees what they sign.
 * Who shows it: ClassResultsForm. What it calls: CertificateFrame, CertificateSeal and the look
 * helpers in lib/certificateLook.ts.
 */
import { CheckIcon } from '@/components/icons/CheckIcon';
import { coverArtwork } from '@/components/covers/coverDesigns';

import {
  certificateColourHex,
  certificateColours,
  certificateFrameBackground,
  certificatePatterns,
  type CertificateLook,
  type CertificatePattern,
} from '../lib/certificateLook';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

import { CertificateFrame, CertificateSeal } from './CertificateFrame';

/** The styles every choice shares: a 44 px target with a visible focus ring on the input. */
const choiceClasses =
  'relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus-ring) has-[:focus-visible]:outline-solid';

/**
 * The colour swatches.
 *
 * @returns the radio group
 */
function ColourChoices({ look, onChange }: CertificateLookPickerProps) {
  const { t } = useCertificatesTranslation();
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 text-sm font-semibold text-ink">{t('look.colour')}</legend>
      <div className="flex flex-wrap gap-2.5">
        {certificateColours.map((colour) => (
          <label
            key={colour}
            className={choiceClasses}
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
 * A small tile showing one pattern in the chosen colour.
 *
 * @returns the tile's drawing, hidden from screen readers
 */
function PatternTile({ pattern, look }: { pattern: CertificatePattern; look: CertificateLook }) {
  if (pattern === 'none') return null;
  const artwork = coverArtwork(pattern);
  return (
    <svg
      viewBox="0 0 100 160"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className="absolute inset-0 h-full w-full rounded-full opacity-40"
      style={{ color: certificateColourHex[look.colour].light }}
    >
      {artwork.fillPath !== '' && <path d={artwork.fillPath} fill="currentColor" />}
      {artwork.strokePath !== '' && (
        <path
          d={artwork.strokePath}
          fill="none"
          stroke="currentColor"
          strokeWidth={artwork.strokeWidth}
        />
      )}
    </svg>
  );
}

/**
 * The pattern tiles.
 *
 * @returns the radio group
 */
function PatternChoices({ look, onChange }: CertificateLookPickerProps) {
  const { t } = useCertificatesTranslation();
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 text-sm font-semibold text-ink">{t('look.pattern')}</legend>
      <div className="flex flex-wrap gap-2.5">
        {certificatePatterns.map((pattern) => (
          <label
            key={pattern}
            className={`${choiceClasses} overflow-hidden border border-control bg-white`}
          >
            <input
              type="radio"
              name="certificate-pattern"
              value={pattern}
              checked={look.pattern === pattern}
              onChange={() => onChange({ ...look, pattern })}
              className="sr-only"
            />
            <PatternTile pattern={pattern} look={look} />
            <span className="sr-only">{t(`look.patterns.${pattern}`)}</span>
            {pattern === 'none' && look.pattern !== 'none' && (
              <span aria-hidden="true" className="text-xs text-meta">
                {t('look.noneShort')}
              </span>
            )}
            {look.pattern === pattern && <CheckIcon size={16} className="relative text-ink" />}
          </label>
        ))}
      </div>
      <p className="m-0 text-sm text-meta">{t('look.patternHint')}</p>
    </fieldset>
  );
}

/** What the picker needs. */
interface CertificateLookPickerProps {
  look: CertificateLook;
  onChange: (look: CertificateLook) => void;
}

/**
 * Renders the picker beside its preview.
 *
 * @param props.look - the look chosen so far
 * @param props.onChange - called with the new look
 * @param props.programmeName - the programme, for the preview
 * @returns the section
 */
export function CertificateLookPicker({
  look,
  onChange,
  programmeName,
}: CertificateLookPickerProps & { programmeName: string }) {
  const { t } = useCertificatesTranslation();
  return (
    <section aria-labelledby="certificate-look-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3
          id="certificate-look-heading"
          className="m-0 font-heading text-xl font-bold text-heading"
        >
          {t('look.title')}
        </h3>
        <p className="m-0 text-sm text-body">{t('look.intro')}</p>
      </div>
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
        <div className="flex flex-col gap-5">
          <ColourChoices look={look} onChange={onChange} />
          <PatternChoices look={look} onChange={onChange} />
        </div>
        <CertificateFrame look={look} patternId="certificate-look-preview" isCompact>
          <div
            aria-hidden="true"
            className="flex flex-col items-center gap-2 px-4 py-6 text-center"
          >
            <CertificateSeal look={look} size="small" />
            <p className="m-0 font-heading text-lg font-bold">{t('look.previewName')}</p>
            <p className="m-0 text-sm break-words">
              {programmeName.trim() || t('look.previewProgramme')}
            </p>
          </div>
        </CertificateFrame>
      </div>
    </section>
  );
}
