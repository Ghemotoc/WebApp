/**
 * ClassCertificatesCard: "Certificates" in a class space's settings, the teacher's way to the
 * class's certificates page (bundle CLASSES, part e; story S1-E8-12 criterion 5).
 *
 * Who shows it: SpaceSettingsPage, for a class, to its teacher (the owner) only, because only
 * the teacher signs. What it links to: /spaces/:spaceSlug/certificates.
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';

import { useCertificatesTranslation } from '../registerCertificatesTranslations';

/**
 * Renders the card.
 *
 * @param props.slug - the class's address
 * @returns the card
 */
export function ClassCertificatesCard({ slug }: { slug: string }) {
  const { t } = useCertificatesTranslation();
  return (
    <section
      aria-labelledby="class-certificates-heading"
      className="flex w-full max-w-[760px] flex-col gap-3 rounded-[28px] border border-border bg-surface p-6"
    >
      <Eyebrow>{t('settingsCard.eyebrow')}</Eyebrow>
      <h2
        id="class-certificates-heading"
        className="m-0 font-heading text-2xl font-bold text-heading"
      >
        {t('settingsCard.title')}
      </h2>
      <p className="m-0 text-body">{t('settingsCard.body')}</p>
      <Link to={`/spaces/${slug}/certificates`} className="w-fit font-semibold text-link underline">
        {t('settingsCard.link')}
      </Link>
    </section>
  );
}
