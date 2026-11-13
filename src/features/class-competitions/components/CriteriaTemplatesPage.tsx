/**
 * CriteriaTemplatesPage: /spaces/<slug>/competition/templates, the teacher's own saved sets of
 * grading criteria (bundle CLASS-POINTS, part 2; story S1-E8-19; Robert, 13 Nov 2026, 19:21
 * UTC). Templates belong to the teacher's account, not to one class, and the app ships none.
 *
 * What it shows: each template's name and how many criteria it has, with "Edit" and "Delete";
 * "New template"; and the editor (name plus CriteriaEditor) for the one being written. Changing
 * or deleting a template leaves competitions made from it as they are.
 * Who shows it: the router; ClassGradeCard and the competition form link here.
 * What it calls: useCriteriaTemplates → my_criteria_templates(); useChangeCriteriaTemplates →
 * save_criteria_template() and delete_criteria_template(), which answer only a teacher.
 */
import { type FormEvent, useState } from 'react';
import { useParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { TextInput } from '@/components/ui/TextInput';
import { SpaceBreadcrumb } from '@/features/spaces/components/SpaceBreadcrumb';
import { useSpace } from '@/features/spaces/hooks/useSpaces';

import type { Criterion } from '../api/classCompetitions';
import type { CompetitionFailure } from '../api/competitionErrors';
import type { CriteriaTemplate } from '../api/criteriaTemplates';
import { useChangeCriteriaTemplates, useCriteriaTemplates } from '../hooks/useCriteriaTemplates';
import { copiedCriteria, emptyCriterion } from '../lib/criteriaDraft';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

import { CriteriaEditor } from './CriteriaEditor';

/** The template being written: a saved one being changed, or a new one (templateId null). */
interface Draft {
  templateId: string | null;
  name: string;
  criteria: Criterion[];
}

/** What the editor needs. */
interface TemplateEditorProps {
  draft: Draft;
  isRunning: boolean;
  onChange: (draft: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * The name field, the criteria editor and "Save template" / "Cancel".
 *
 * @returns the form
 */
function TemplateEditor({ draft, isRunning, onChange, onSave, onCancel }: TemplateEditorProps) {
  const { t } = useClassCompetitionsTranslation();

  /** Hands the save to the page instead of reloading it. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave();
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 shadow-card md:p-6"
    >
      <TextInput
        id="template-name"
        label={t('templates.name')}
        maxLength={80}
        required
        value={draft.name}
        onChange={(event) => onChange({ ...draft, name: event.target.value })}
      />
      <CriteriaEditor
        idPrefix="template"
        criteria={draft.criteria}
        onChange={(criteria) => onChange({ ...draft, criteria })}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isRunning}>
          {t('templates.save')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('templates.cancel')}
        </Button>
      </div>
    </form>
  );
}

/** What the list needs. */
interface TemplateListProps {
  templates: CriteriaTemplate[];
  isRunning: boolean;
  onEdit: (template: CriteriaTemplate) => void;
  onDelete: (template: CriteriaTemplate) => void;
}

/**
 * The saved templates, each with "Edit" and "Delete".
 *
 * @returns the list, or a line saying there are none
 */
function TemplateList({ templates, isRunning, onEdit, onDelete }: TemplateListProps) {
  const { t } = useClassCompetitionsTranslation();
  if (templates.length === 0) return <p className="m-0 text-body">{t('templates.empty')}</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {templates.map((template) => (
        <li
          key={template.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
        >
          <p className="m-0 min-w-0 wrap-anywhere">
            <span className="font-semibold text-ink">{template.name}</span>{' '}
            <span className="text-sm text-meta">
              ({t('templates.criteriaCount', { count: template.criteria.length })})
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => onEdit(template)}>
              {t('templates.edit', { name: template.name })}
            </Button>
            <Button variant="secondary" disabled={isRunning} onClick={() => onDelete(template)}>
              {t('templates.delete', { name: template.name })}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** What the last press ended with. */
type Outcome = 'saved' | 'deleted' | null;

/**
 * What happened after a press, read out politely.
 *
 * @param props.failure - why the database refused, or null
 * @param props.outcome - what the page itself knows
 * @returns the live region
 */
function TemplatesOutcome(props: { failure: CompetitionFailure | null; outcome: Outcome }) {
  const { t } = useClassCompetitionsTranslation();
  return (
    <div aria-live="polite">
      {props.failure !== null && props.outcome === null && (
        <Notice tone="error">{t(`failures.${props.failure}`)}</Notice>
      )}
      {props.outcome !== null && <Notice tone="success">{t(`templates.${props.outcome}`)}</Notice>}
    </div>
  );
}

/**
 * The list, "New template", the editor and what happened.
 *
 * @returns the page's body
 */
function TemplatesBody() {
  const { t } = useClassCompetitionsTranslation();
  const read = useCriteriaTemplates();
  const changer = useChangeCriteriaTemplates();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  if (read.isError) return <Notice tone="error">{t('templates.loadFailed')}</Notice>;
  if (read.data === undefined) return null;

  /** Saves the draft, then closes the editor. */
  async function save() {
    if (draft === null) return;
    setOutcome(null);
    const saved = await changer.save({ ...draft, name: draft.name.trim() }).catch(() => undefined);
    if (saved === undefined) return;
    setDraft(null);
    setOutcome('saved');
  }

  /** Deletes a template. */
  async function remove(template: CriteriaTemplate) {
    setOutcome(null);
    const left = await changer.remove(template.id).catch(() => undefined);
    if (left !== undefined) setOutcome('deleted');
  }

  /** Opens the editor on a copy of a saved template. */
  function edit(template: CriteriaTemplate) {
    setOutcome(null);
    setDraft({
      templateId: template.id,
      name: template.name,
      criteria: copiedCriteria(template.criteria),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <TemplateList
        templates={read.data}
        isRunning={changer.isRunning}
        onEdit={edit}
        onDelete={remove}
      />
      {draft === null ? (
        <Button
          className="w-fit"
          onClick={() => setDraft({ templateId: null, name: '', criteria: [emptyCriterion()] })}
        >
          {t('templates.new')}
        </Button>
      ) : (
        <TemplateEditor
          draft={draft}
          isRunning={changer.isRunning}
          onChange={setDraft}
          onSave={save}
          onCancel={() => setDraft(null)}
        />
      )}
      <TemplatesOutcome failure={changer.failure?.failure ?? null} outcome={outcome} />
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function CriteriaTemplatesPage() {
  const { t } = useClassCompetitionsTranslation();
  const { spaceSlug = '' } = useParams();
  const name = useSpace(spaceSlug).data?.name ?? '';
  return (
    <PageContainer className="flex max-w-[860px] flex-col gap-6 py-10">
      <title>{t('templates.documentTitle')}</title>
      <SpaceBreadcrumb space={{ slug: spaceSlug, name }} current={t('templates.title')} />
      <header className="flex flex-col gap-2">
        <Eyebrow>{name}</Eyebrow>
        <h1 className="m-0 font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-extrabold text-heading">
          {t('templates.title')}
        </h1>
        <p className="m-0 max-w-[640px] text-body">{t('templates.intro')}</p>
      </header>
      <TemplatesBody />
    </PageContainer>
  );
}
