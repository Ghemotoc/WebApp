/**
 * AgeRulesSection: Age rules by country on Staff › Settings (bundle MARKETS-1, story S1-E2-21).
 *
 * One row per country (and per region with its own law, such as Quebec): the age to join, the
 * age below which a parent or guardian must agree, the age below which sign-up is blocked (blank
 * means never), the source, the date checked, the confidence, the status and notes (criterion 1).
 * A row with low confidence or checked more than six months ago is flagged "Check again"
 * (criterion 3), and "Needs a look" shows only those. "Edit" opens AgeRuleEditor under the table;
 * "Add a country or region" opens it empty. Saving needs a reason and is audited (criterion 2).
 * Who shows it: SettingsPage, for the owner and admins. Plain components, no doodles.
 * What it calls: useAgeRulesAdmin; the table is the Logs pages' LogTable.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import { LogTable, type LogTableRow } from '@/features/staff/components/logs/LogTable';
import { placeName, ruleNeedsReview, type AgeRule } from '@/lib/age-rules';

import { useAgeRulesAdmin } from '../hooks/useAgeRulesAdmin';

import { emptyAgeRule } from '../lib/ageRuleFields';

import { AgeRuleEditor } from './AgeRuleEditor';
import { SettingsFailureNotice } from './SettingsFailureNotice';
import { SettingsSection } from './SettingsSection';

/**
 * The source as a link when it is a web address, else as text.
 *
 * @returns the cell
 */
function SourceCell({ source }: { source: string }) {
  if (!source.startsWith('https://')) return <span>{source}</span>;
  return (
    <a href={source} target="_blank" rel="noopener noreferrer" className="text-link underline">
      {source}
    </a>
  );
}

/**
 * Builds the table's rows.
 *
 * @param rules - the rules to show
 * @param onEdit - opens the editor for a rule
 * @returns the rows, cells in the order of the headings
 */
function useRuleRows(rules: AgeRule[], onEdit: (rule: AgeRule) => void): LogTableRow[] {
  const { t, i18n } = useTranslation('settings');
  return rules.map((rule) => {
    const name = placeName(rule, i18n.language, t('ageRules.defaultName'));
    return {
      key: rule.id,
      cells: [
        name,
        rule.minimumAge,
        rule.parentalConsentBelow,
        rule.signupBlockedBelow ?? t('ageRules.never'),
        <SourceCell key="source" source={rule.source} />,
        rule.dateChecked,
        t(`ageRules.confidences.${rule.confidence}`),
        <span key="status" className="inline-flex flex-wrap gap-1.5">
          {t(`ageRules.statuses.${rule.status}`)}
          {ruleNeedsReview(rule) && <InfoPill tone="gold">{t('ageRules.checkAgain')}</InfoPill>}
        </span>,
        rule.notes,
        // The visible word stays short so the button fits a phone; the accessible name still
        // says which place it edits (WCAG 2.5.3: the name starts with the visible word).
        <Button
          key="edit"
          variant="secondary"
          aria-label={t('ageRules.edit', { name })}
          onClick={() => onEdit(rule)}
        >
          {t('ageRules.editShort')}
        </Button>,
      ],
    };
  });
}

/**
 * Renders the section.
 *
 * @returns the filter, the table and, while editing, the editor
 */
export function AgeRulesSection() {
  const { t } = useTranslation('settings');
  const state = useAgeRulesAdmin();
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<AgeRule | null>(null);
  const shown =
    filter === 'review' ? state.rules.filter((rule) => ruleNeedsReview(rule)) : state.rules;
  const openEditor = (rule: AgeRule) => {
    state.resetSave();
    setEditing(rule);
  };
  const rows = useRuleRows(shown, openEditor);
  const headings = [
    'place',
    'join',
    'consent',
    'blocked',
    'source',
    'checked',
    'confidence',
    'status',
    'notes',
    'actions',
  ];

  return (
    <SettingsSection id="age-rules" heading={t('sections.ageRules')} intro={t('ageRules.intro')}>
      <SettingsFailureNotice failure={state.loadFailure} />
      <ChoiceChips
        label={t('ageRules.filterLabel')}
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t('ageRules.filters.all', { count: state.rules.length }) },
          { value: 'review', label: t('ageRules.filters.review') },
        ]}
      />
      <LogTable
        caption={t('ageRules.caption')}
        headings={headings.map((heading) => t(`ageRules.headings.${heading}`))}
        rows={rows}
        emptyNote={state.isLoading ? t('loading') : t('ageRules.empty')}
      />
      {editing === null && state.wasSaved && <Notice tone="success">{t('ageRules.saved')}</Notice>}
      {editing === null ? (
        <Button variant="secondary" className="self-start" onClick={() => openEditor(emptyAgeRule)}>
          {t('ageRules.add')}
        </Button>
      ) : (
        <AgeRuleEditor
          key={editing.id}
          rule={editing}
          state={state}
          onClose={() => setEditing(null)}
        />
      )}
    </SettingsSection>
  );
}
