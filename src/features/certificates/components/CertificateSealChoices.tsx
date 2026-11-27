/**
 * CertificateSealChoices: the teacher's choice of what a programme's certificate seal shows (bundle
 * G13b; board G14, "In the seal", bundle BOOKS-8, part 8c).
 *
 * "In the seal" picks the cat or the school's crest, as a segmented pair (board G14) with the
 * crest's rules under it. With the crest picked, "Crest colours" picks its own colours on a white
 * seal or white on the certificate colour, and CertificateCrestField uploads, shows and removes
 * the class's crest. Both pairs are SegmentedControl: real radio buttons, so arrow keys move
 * between them and the chosen one shows by shape and weight, not colour alone.
 * Who shows it: CertificateLookPicker. What it calls: SegmentedControl and CertificateCrestField.
 */
import { SegmentedControl } from '@/components/ui/SegmentedControl';
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <SegmentedControl
          legend={t('look.seal')}
          name="certificate-seal"
          options={sealOptions}
          value={look.seal}
          onChange={(value) => onChange({ ...look, seal: certificateSealOf(value) })}
        />
        <p className="m-0 max-w-none type-meta text-ink-muted">{t('look.sealHint')}</p>
      </div>
      {look.seal === 'crest' && (
        <>
          <div className="flex flex-col gap-2">
            <SegmentedControl
              legend={t('look.crestColours')}
              name="certificate-crest-colours"
              options={colourOptions}
              value={look.crestColours}
              onChange={(value) => onChange({ ...look, crestColours: crestColoursOf(value) })}
            />
            <p className="m-0 max-w-[480px] type-meta text-ink-muted">
              {t('look.crestColoursHint')}
            </p>
          </div>
          <CertificateCrestField space={space} />
        </>
      )}
    </div>
  );
}
