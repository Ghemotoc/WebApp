/**
 * CriteriaTemplateTools: the two template tools on the competition form (bundle CLASS-POINTS,
 * part 2; story S1-E8-19; Robert, 13 Nov 2026, 19:21 UTC: each teacher can create their own
 * templates, which they can use or just create new criteria).
 *
 * What it shows: TemplatePicker, a drop-down of the teacher's saved templates with "Use
 * template", which copies the criteria into the form; and SaveAsTemplate, a name field with
 * "Save as template", which keeps the criteria now in the form for later. The copy and the
 * template are separate: changing one never changes the other.
 * Who shows it: CompetitionFormPage. What it calls: useCriteriaTemplates →
 * my_criteria_templates(); useChangeCriteriaTemplates → save_criteria_template().
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';

import type { Criterion } from '../api/classCompetitions';
import type { CriteriaTemplate } from '../api/criteriaTemplates';
import { useChangeCriteriaTemplates, useCriteriaTemplates } from '../hooks/useCriteriaTemplates';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

/** What the picker needs. */
export interface TemplatePickerProps {
  /** The class's address, for the link to the templates page. */
  slug: string;
  /** Takes the chosen template; the form copies its criteria. */
  onUse: (template: CriteriaTemplate) => void;
}

/**
 * The drop-down of saved templates and "Use template".
 *
 * @returns the picker, a note when there are no templates, and the link to manage them
 */
export function TemplatePicker({ slug, onUse }: TemplatePickerProps) {
  const { t } = useClassCompetitionsTranslation();
  const templates = useCriteriaTemplates().data ?? [];
  const [pickedId, setPickedId] = useState('');
  const [usedName, setUsedName] = useState<string | null>(null);
  const picked = templates.find((template) => template.id === pickedId);

  /** Copies the chosen template into the form, then says so. */
  function use() {
    if (picked === undefined) return;
    onUse(picked);
    setUsedName(picked.name);
  }

  return (
    <div className="flex flex-col gap-3">
      {templates.length === 0 ? (
        <p className="m-0 text-sm text-body">{t('form.templateEmpty')}</p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <Select
            id="competition-template"
            label={t('form.templateSelect')}
            isLabelVisible
            placement="form"
            options={[
              { value: '', label: t('form.templateNone') },
              ...templates.map((template) => ({ value: template.id, label: template.name })),
            ]}
            value={pickedId}
            onChange={setPickedId}
          />
          <Button variant="secondary" disabled={picked === undefined} onClick={use}>
            {t('form.templateUse')}
          </Button>
        </div>
      )}
      <Link
        to={`/spaces/${slug}/competition/templates`}
        className="w-fit font-semibold text-link underline"
      >
        {t('form.manageTemplates')}
      </Link>
      <div aria-live="polite">
        {usedName !== null && (
          <Notice tone="success">{t('form.templateUsed', { name: usedName })}</Notice>
        )}
      </div>
    </div>
  );
}

/**
 * A name field and "Save as template" for the criteria now in the form.
 *
 * @param props.criteria - the criteria to keep
 * @returns the field, the button and what happened
 */
export function SaveAsTemplate({ criteria }: { criteria: Criterion[] }) {
  const { t } = useClassCompetitionsTranslation();
  const changer = useChangeCriteriaTemplates();
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState<string | null>(null);

  /** Saves the criteria under the typed name. */
  async function save() {
    setSavedName(null);
    const request = { templateId: null, name: name.trim(), criteria };
    const saved = await changer.save(request).catch(() => undefined);
    if (saved === undefined) return;
    setSavedName(request.name);
    setName('');
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-60">
          <TextInput
            id="competition-template-name"
            label={t('form.templateName')}
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <Button
          variant="secondary"
          disabled={changer.isRunning || name.trim() === ''}
          onClick={save}
        >
          {t('form.templateSave')}
        </Button>
      </div>
      <div aria-live="polite">
        {changer.failure !== null && savedName === null && (
          <Notice tone="error">{t(`failures.${changer.failure.failure}`)}</Notice>
        )}
        {savedName !== null && (
          <Notice tone="success">{t('form.templateSaved', { name: savedName })}</Notice>
        )}
      </div>
    </div>
  );
}
