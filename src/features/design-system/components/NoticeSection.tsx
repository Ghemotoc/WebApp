/**
 * NoticeSection: the four notice tones and an empty state on /design (story S1-E1-03).
 * Who uses it: DesignPage.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Notice, type NoticeTone } from '@/components/ui/Notice';

import { DesignSection } from './DesignSection';

/** The four tones. */
const noticeTones: NoticeTone[] = ['success', 'info', 'warning', 'error'];

/**
 * Renders the notices and the empty state.
 *
 * @returns the section
 */
export function NoticeSection() {
  const { t } = useTranslation('design');

  return (
    <DesignSection id="notices" title={t('sections.notices')}>
      <div className="grid max-w-[720px] gap-3">
        {noticeTones.map((tone) => (
          <Notice key={tone} tone={tone} title={t(`notices.${tone}Title`)}>
            {t(`notices.${tone}Text`)}
          </Notice>
        ))}
      </div>
      <div className="max-w-[720px]">
        <EmptyState
          title={t('notices.emptyTitle')}
          description={t('notices.emptyDescription')}
          action={<Button>{t('notices.emptyAction')}</Button>}
        />
      </div>
    </DesignSection>
  );
}
