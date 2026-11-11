/**
 * CertificateSealChoices: the teacher's choice of what a programme's certificate seal shows (bundle
 * G13b; the canvas's SpaceCertificates board, "In the seal", "Crest colours" and the upload row).
 *
 * "In the seal" picks the cat or the school's crest. With the crest picked, "Crest colours" picks
 * its own colours on a white seal or white on the certificate colour, and CertificateCrestField
 * uploads, shows and removes the class's crest. Both choices are ChoiceChips (real radio buttons,
 * arrow keys move between them, a tick marks the chosen one), the same control the board's
 * segmented pair stands for.
 * Who shows it: CertificateLookPicker. What it calls: ChoiceChips and CertificateCrestField.
 */
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { brand } from '@/config/brand';

import {
  certificateSealOf,
  certificateSeals,
  crestColourChoices,
  crestColoursOf,
  type CertificateLook,
} from '../lib/certificateLook';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

import { CertificateCrestField } from './CertificateCrestField';

/** What the choices need. */
interface CertificateSealChoicesProps {
  look: CertificateLook;
  onChange: (look: CertificateLook) => void;
  /** The class, for the crest's upload. */
  space: { slug: string; spaceId: string };
}

/**
 * Renders the seal choices.
 *
 * @returns the seal choice, and with the crest picked its colours and the upload
 */
export function CertificateSealChoices({ look, onChange, space }: CertificateSealChoicesProps) {
  const { t } = useCertificatesTranslation();
  const sealOptions = certificateSeals.map((seal) => ({
    value: seal,
    label: t(`look.seals.${seal}`, { productName: brand.productName }),
  }));
  const colourOptions = crestColourChoices.map((choice) => ({
    value: choice,
    label: t(`look.crestColourChoices.${choice}`),
  }));
  return (
    <div className="flex flex-col gap-5">
      <ChoiceChips
        label={t('look.seal')}
        isLabelVisible
        options={sealOptions}
        value={look.seal}
        onChange={(value) => onChange({ ...look, seal: certificateSealOf(value) })}
      />
      {look.seal === 'crest' && (
        <>
          <ChoiceChips
            label={t('look.crestColours')}
            isLabelVisible
            options={colourOptions}
            value={look.crestColours}
            onChange={(value) => onChange({ ...look, crestColours: crestColoursOf(value) })}
            description={t('look.crestColoursHint')}
          />
          <CertificateCrestField space={space} />
        </>
      )}
    </div>
  );
}
