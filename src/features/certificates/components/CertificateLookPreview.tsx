/**
 * CertificateLookPreview: the "Preview" beside the teacher's certificates form (bundle G13a; board
 * G14, bundle BOOKS-8, part 8c).
 *
 * What it shows: the same frame and seal as the pupil's certificate, in the chosen colour and
 * pattern, with the first pupil's name, what the certificate says ("won …, in Class 9B") and the
 * teacher who signs, so the teacher sees what they sign before approving. It draws the crest only
 * once its check passed, as pupils will see it (G13b). It is a picture of the choices, so screen
 * readers skip its words and hear only its name.
 * Who shows it: CertificateFormColumns. What it calls: CertificateFrame, CertificateSeal and
 * useClassCertificateCrest().
 */
import type { CertificateResult } from '../api/certificates';
import { useClassCertificateCrest } from '../hooks/useCertificateCrest';
import type { CertificateLook } from '../lib/certificateLook';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

import { CertificateFrame } from './CertificateFrame';
import { CertificateSeal } from './CertificateSeal';

/** The sheet sentence for each result, the same keys CertificateSheet prints. */
const sentenceKeys: Record<CertificateResult, string> = {
  winner: 'sheet.forWinner',
  finalist: 'sheet.forFinalist',
  participant: 'sheet.forParticipant',
  readers_choice: 'sheet.forReadersChoice',
};

/** Who and what the preview shows. */
export interface CertificatePreviewEntry {
  /** The first pupil's name, or null for "Pupil's name". */
  name: string | null;
  /** Their result; Winner when nobody is picked yet. */
  result: CertificateResult;
}

/** What the preview needs. */
export interface CertificateLookPreviewProps {
  look: CertificateLook;
  programmeName: string;
  className: string;
  /** The class's address, for its crest. */
  slug: string;
  entry: CertificatePreviewEntry;
}

/**
 * Renders the preview.
 *
 * @param props - see CertificateLookPreviewProps
 * @returns the section
 */
export function CertificateLookPreview({
  look,
  programmeName,
  className,
  slug,
  entry,
}: CertificateLookPreviewProps) {
  const { t } = useCertificatesTranslation();
  const crest = useClassCertificateCrest(slug).data ?? null;
  const crestUrl = crest?.state === 'visible' ? crest.url : null;
  const programme = programmeName.trim() || t('look.previewProgramme');
  const name = entry.name ?? t('look.previewName');
  return (
    <section aria-labelledby="certificate-preview-heading" className="flex min-w-0 flex-col gap-2">
      <h2 id="certificate-preview-heading" className="m-0 type-subheading text-ink-heading">
        {t('look.previewTitle')}
      </h2>
      <figure className="m-0" aria-label={t('look.previewLabel', { name })}>
        <CertificateFrame look={look} patternId="certificate-look-preview" isCompact>
          <div
            aria-hidden="true"
            className="flex flex-col items-center gap-3 px-4 py-6 text-center"
          >
            <CertificateSeal look={look} size="small" crestUrl={crestUrl} />
            <p className="m-0 font-story text-2xl leading-[30px] font-semibold break-words">
              {name}
            </p>
            <p className="m-0 type-body break-words">
              {t(sentenceKeys[entry.result], { programme, className })}
            </p>
          </div>
        </CertificateFrame>
      </figure>
    </section>
  );
}
