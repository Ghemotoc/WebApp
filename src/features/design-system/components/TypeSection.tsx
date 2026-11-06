/**
 * TypeSection: the fonts and the type scale from the boards, on /design (story S1-E1-03).
 * Bricolage Grotesque for headings, Inter for body and for the parent company's eyebrows (Inter Bold,
 * 12 px, capitals, 0.2em spacing; Robert, 6 Nov 2026) and Shadows Into Light Two for handwriting
 * (CLAUDE.md, Designs; DoD design rules).
 * Who uses it: DesignPage. The e2e test reads the computed fonts from these samples.
 */
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';

import { DesignSection } from './DesignSection';

/**
 * Renders the type samples.
 *
 * @returns the section
 */
export function TypeSection() {
  const { t } = useTranslation('design');

  return (
    <DesignSection id="type" title={t('sections.type')}>
      <div className="flex flex-col gap-4" data-testid="type-samples">
        <Eyebrow>{t('type.eyebrow')}</Eyebrow>
        <p className="m-0 font-heading text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em] text-heading">
          {t('type.heading1')}
        </p>
        <p className="m-0 font-heading text-[30px] font-bold tracking-[-0.01em] text-heading">
          {t('type.heading2')}
        </p>
        <p className="m-0 font-heading text-xl font-bold text-ink">{t('type.heading3')}</p>
        <p className="m-0 max-w-[640px] text-lg leading-[1.6] text-body">{t('type.lede')}</p>
        <p className="m-0 max-w-[640px] text-base text-ink">{t('type.body')}</p>
        <p className="m-0 text-[13px] text-meta">{t('type.meta')}</p>
        <p className="m-0 w-fit -rotate-2 font-hand text-[19px] text-eyebrow">{t('type.hand')}</p>
      </div>
    </DesignSection>
  );
}
