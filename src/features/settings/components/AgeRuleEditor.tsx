/**
 * AgeRuleEditor: change one age rule, or add a country or region (bundle MARKETS-1, story
 * S1-E2-21, criterion 2).
 *
 * The three ages, where they come from (legal basis and source), the date checked, how sure we are,
 * whether a lawyer has confirmed it, notes, and a reason, which the audit log keeps with the
 * values before and after. The fields themselves are in AgeRuleFieldList; this form holds their
 * values and saves them. The database checks the ages again (13 to 18, a block age at or above the
 * minimum) and refuses anyone but the owner and admins.
 * Who shows it: AgeRulesSection, under the table. What it calls: the section's save().
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import type { AgeRule } from '@/lib/age-rules';
import { errorShownByHook } from '@/lib/errorShownByHook';

import type { AgeRulesAdminState } from '../hooks/useAgeRulesAdmin';
import { emptyAgeRule, fieldsOf, ruleOf, type EditorFields } from '../lib/ageRuleFields';

import { AgeRuleFieldList } from './AgeRuleFieldList';
import { SettingsFailureNotice } from './SettingsFailureNotice';

/** What the editor needs. */
interface AgeRuleEditorProps {
  rule: AgeRule;
  state: AgeRulesAdminState;
  onClose: () => void;
}

/**
 * Renders the editor.
 *
 * @returns the form
 */
export function AgeRuleEditor({ rule, state, onClose }: AgeRuleEditorProps) {
  const { t } = useTranslation('settings');
  const [fields, setFields] = useState<EditorFields>(() => fieldsOf(rule));
  const isNew = rule.id === emptyAgeRule.id;

  /** Changes one field as typed. */
  function changeField(field: keyof EditorFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  /** Saves, then closes the editor; a refusal stays on screen with its reason. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void state
      .save({ rule: ruleOf(fields), reason: fields.reason.trim() })
      .then(onClose)
      .catch(errorShownByHook);
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label={t('ageRules.editorLabel')}
      className="flex flex-col gap-4 rounded-card border border-border p-4"
    >
      <h3 className="m-0 text-base font-bold text-heading">
        {isNew ? t('ageRules.add') : t('ageRules.editing', { name: rule.name })}
      </h3>
      <AgeRuleFieldList fields={fields} isNew={isNew} onChange={changeField} />
      <SettingsFailureNotice failure={state.saveFailure} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={state.isSaving}>
          {state.isSaving ? t('ageRules.saving') : t('ageRules.save')}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('ageRules.cancel')}
        </Button>
      </div>
    </form>
  );
}
