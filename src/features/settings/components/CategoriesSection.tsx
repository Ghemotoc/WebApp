/**
 * CategoriesSection: the categories in the order readers see them, each with Up and Down
 * (story S1-E11-03, criterion 1: admins edit categories).
 *
 * A move saves at once and is logged. Categories are moved, not added here: a new one needs its
 * name in both locale files, so it arrives in a release (CLAUDE.md rule 4).
 * Who shows it: SettingsPage. What it calls: useCategoryOrder.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import { useCategoryOrder } from '../hooks/useCategoryOrder';

import { SettingsFailureNotice } from './SettingsFailureNotice';
import { SettingsSection } from './SettingsSection';

/**
 * Renders the section.
 *
 * @returns the categories with their buttons
 */
export function CategoriesSection() {
  const { t } = useTranslation('settings');
  const { slugs, loadFailure, move, isMoving, moveFailure } = useCategoryOrder();
  return (
    <SettingsSection
      id="categories"
      heading={t('sections.categories')}
      intro={t('categories.intro')}
    >
      <SettingsFailureNotice failure={loadFailure ?? moveFailure} />
      <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-label={t('categories.listLabel')}>
        {slugs.map((slug, index) => {
          const name = t(`categories.${slug}`, { ns: 'writing', defaultValue: slug });
          return (
            <li
              key={slug}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 first:border-t-0 first:pt-0"
            >
              <span className="text-sm text-ink">
                {name}{' '}
                <span className="text-meta">
                  ({t('categories.position', { position: index + 1, total: slugs.length })})
                </span>
              </span>
              <span className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={isMoving || index === 0}
                  aria-label={t('categories.moveUp', { name })}
                  onClick={() => move(slug, -1)}
                >
                  ↑
                </Button>
                <Button
                  variant="secondary"
                  disabled={isMoving || index === slugs.length - 1}
                  aria-label={t('categories.moveDown', { name })}
                  onClick={() => move(slug, 1)}
                >
                  ↓
                </Button>
              </span>
            </li>
          );
        })}
      </ol>
    </SettingsSection>
  );
}
