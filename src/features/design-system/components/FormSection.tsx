/**
 * FormSection: the drop-down, text fields and search field on /design (story S1-E1-03).
 * The drop-down shows the one Select style (only as wide as its longest option).
 * Who uses it: DesignPage. The e2e test measures the drop-down's width here.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';

import { DesignSection } from './DesignSection';

/**
 * Renders the form fields.
 *
 * @returns the section
 */
export function FormSection() {
  const { t } = useTranslation('design');
  const [sortOrder, setSortOrder] = useState('newest');

  const sortOptions = [
    { value: 'newest', label: t('forms.selectNewest') },
    { value: 'popular', label: t('forms.selectPopular') },
    { value: 'completed', label: t('forms.selectCompleted') },
  ];

  return (
    <DesignSection id="forms" title={t('sections.forms')}>
      <div data-testid="sort-select">
        <Select
          id="design-sort"
          label={t('forms.selectLabel')}
          isLabelVisible
          options={sortOptions}
          value={sortOrder}
          onChange={setSortOrder}
        />
      </div>
      <div className="grid max-w-[560px] gap-5">
        <TextInput id="design-pen-name" label={t('forms.inputLabel')} hint={t('forms.inputHint')} />
        <TextInput
          id="design-pen-name-error"
          label={t('forms.inputLabel')}
          errorMessage={t('forms.inputError')}
          defaultValue="A"
        />
        <Textarea id="design-comment" label={t('forms.textareaLabel')} />
        <SearchInput
          id="design-search"
          label={t('forms.searchLabel')}
          placeholder={t('forms.searchPlaceholder')}
        />
      </div>
    </DesignSection>
  );
}
