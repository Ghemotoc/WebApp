/**
 * ColourSection: light and night token pairs side by side on /design (story S1-E1-03).
 * Night colours are derived from the board colours and shown here (Robert, 17 Oct 2026).
 * Who uses it: DesignPage.
 */
import { useTranslation } from 'react-i18next';

import { ColourPanel } from './ColourPanel';
import { DesignSection } from './DesignSection';

/**
 * Renders the colours section.
 *
 * @returns the section
 */
export function ColourSection() {
  const { t } = useTranslation('design');

  return (
    <DesignSection id="colours" title={t('sections.colours')}>
      <p className="m-0 max-w-[720px] text-body">{t('colours.intro')}</p>
      <div className="grid gap-5 md:grid-cols-2">
        <ColourPanel theme="light" />
        <ColourPanel theme="night" />
      </div>
    </DesignSection>
  );
}
