/**
 * AfterTheTestLabel: the small label on legal text that applies only after the invited test
 * (story S1-E14-01; decided 17 Oct 2026, 19:43: mark these lines inline without changing words).
 *
 * Who uses it: LegalMarkdown (on a line) and LegalSectionCard (on a whole section).
 * It is real text, so screen readers read it before the line it marks (WCAG 2.2, 1.3.1).
 */
import { useTranslation } from 'react-i18next';

import { InfoPill } from '@/components/ui/InfoPill';

/**
 * Renders the label, with a little space after it when it sits inside a line of text.
 *
 * @returns the label
 */
export function AfterTheTestLabel() {
  const { t, i18n } = useTranslation('legal');
  return (
    // The label is interface text, so it carries the interface language even inside an English text.
    <span lang={i18n.language} className="mr-2 inline-flex align-middle">
      <InfoPill tone="sky">{t('afterTheTest.label')}</InfoPill>
    </span>
  );
}
