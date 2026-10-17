/**
 * ButtonSection: every button variant and size on /design (story S1-E1-03).
 * Who uses it: DesignPage.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import { DesignSection } from './DesignSection';

/**
 * Renders the buttons.
 *
 * @returns the section
 */
export function ButtonSection() {
  const { t } = useTranslation('design');

  return (
    <DesignSection id="buttons" title={t('sections.buttons')}>
      <div className="flex flex-wrap items-center gap-3">
        <Button>{t('buttons.primary')}</Button>
        <Button variant="secondary">{t('buttons.secondary')}</Button>
        <Button variant="text">{t('buttons.text')}</Button>
        <Button variant="destructive">{t('buttons.destructive')}</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg">{t('buttons.large')}</Button>
        <Button size="xl" variant="secondary">
          {t('buttons.extraLarge')}
        </Button>
        <Button disabled>{t('buttons.disabled')}</Button>
      </div>
    </DesignSection>
  );
}
