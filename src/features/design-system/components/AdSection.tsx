/**
 * AdSection: the four ad and sponsor slot formats on /design (story S1-E1-03; AdFormats board).
 * Specimens only: real ads, the per-page limits and "Why this ad?" come with S1-E12.
 * Who uses it: DesignPage. Anchor: /design#ad-formats (the slots' "Why this ad?" link).
 */
import { useTranslation } from 'react-i18next';

import { AdSlot } from '@/components/ui/AdSlot';

import { DesignSection } from './DesignSection';

/**
 * Renders the four slots.
 *
 * @returns the section
 */
export function AdSection() {
  const { t } = useTranslation('design');

  return (
    <DesignSection id="ad-formats" title={t('sections.ads')}>
      <p className="m-0 max-w-[720px] text-body">{t('ads.intro')}</p>
      <AdSlot format="banner" labelKind="ad">
        {t('ads.banner')}
      </AdSlot>
      <div className="flex flex-wrap items-start gap-5">
        <AdSlot format="card" labelKind="sponsored">
          {t('ads.card')}
        </AdSlot>
        <AdSlot format="side" labelKind="ad">
          {t('ads.side')}
        </AdSlot>
        <AdSlot format="portrait" labelKind="ad">
          {t('ads.portrait')}
        </AdSlot>
      </div>
    </DesignSection>
  );
}
