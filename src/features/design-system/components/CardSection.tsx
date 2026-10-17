/**
 * CardSection: a card with label rows (fine lines between rows) on /design (story S1-E1-03).
 * Who uses it: DesignPage.
 */
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { LabelRows } from '@/components/ui/LabelRows';

import { DesignSection } from './DesignSection';

/**
 * Renders the card sample.
 *
 * @returns the section
 */
export function CardSection() {
  const { t } = useTranslation('design');

  const rows = [
    { label: t('cards.rowCategory'), value: t('cards.valueCategory') },
    { label: t('cards.rowStatus'), value: t('cards.valueStatus') },
    { label: t('cards.rowChapters'), value: t('cards.valueChapters') },
  ];

  return (
    <DesignSection id="cards" title={t('sections.cards')}>
      <Card className="max-w-[420px]">
        <h3 className="m-0 mb-4 text-xl font-bold">{t('cards.cardTitle')}</h3>
        <LabelRows rows={rows} />
      </Card>
    </DesignSection>
  );
}
