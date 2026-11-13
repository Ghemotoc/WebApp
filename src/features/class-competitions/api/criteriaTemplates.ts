/**
 * A teacher's own criteria templates (bundle CLASS-POINTS, part 2; story S1-E8-19).
 *
 * Who calls it: hooks/useCriteriaTemplates.ts. What it calls next: my_criteria_templates(),
 * save_criteria_template() and delete_criteria_template().
 *
 * A template belongs to the teacher who saved it and nobody else ever reads it; we ship no
 * ready-made templates (Robert, 13 Nov 2026, 19:21 UTC).
 */
import { objectFrom } from '@/features/class-points/api/classPoints';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { criteriaToJson, criterionFrom, listOf, textOf, type Criterion } from './classCompetitions';
import { competitionErrorFrom } from './competitionErrors';

/** One saved set of criteria. */
export interface CriteriaTemplate {
  id: string;
  name: string;
  criteria: Criterion[];
}

/**
 * Reads a list of templates.
 *
 * @param value - the JSON the database returned
 * @returns the templates, by name
 */
export function templatesFrom(value: Json): CriteriaTemplate[] {
  return listOf(value).map((templateValue) => {
    const template = objectFrom(templateValue) ?? {};
    return {
      id: textOf(template.id),
      name: textOf(template.name),
      criteria: listOf(template.criteria).map(criterionFrom),
    };
  });
}

/**
 * The caller's own templates.
 *
 * @param client - the signed-in Supabase client
 * @returns the templates; empty for someone with none
 * @throws CompetitionError when the database can't be reached
 */
export async function fetchCriteriaTemplates(
  client: AppSupabaseClient,
): Promise<CriteriaTemplate[]> {
  const { data, error } = await client.rpc('my_criteria_templates');
  if (error !== null) throw competitionErrorFrom(error);
  return templatesFrom(data);
}

/** What saving a template sends. */
export interface TemplateRequest {
  /** The template to change, or null for a new one. */
  templateId: string | null;
  name: string;
  criteria: Criterion[];
}

/**
 * Saves a set of criteria as a template, or changes one.
 *
 * @param client - the signed-in Supabase client
 * @param request - the name and the criteria
 * @returns the caller's templates after the change
 * @throws CompetitionError: template_name, template_name_taken, template_too_many,
 *   template_missing, not_teacher or a criteria failure
 */
export async function saveCriteriaTemplate(
  client: AppSupabaseClient,
  request: TemplateRequest,
): Promise<CriteriaTemplate[]> {
  const { data, error } = await client.rpc('save_criteria_template', {
    template_name: request.name,
    criteria: criteriaToJson(request.criteria),
    target_template_id: request.templateId ?? undefined,
  });
  if (error !== null) throw competitionErrorFrom(error);
  return templatesFrom(data);
}

/**
 * Deletes a template. Competitions already made from it don't change.
 *
 * @param client - the signed-in Supabase client
 * @param templateId - the template's ID
 * @returns the caller's templates after the change
 * @throws CompetitionError: template_missing
 */
export async function deleteCriteriaTemplate(
  client: AppSupabaseClient,
  templateId: string,
): Promise<CriteriaTemplate[]> {
  const { data, error } = await client.rpc('delete_criteria_template', {
    target_template_id: templateId,
  });
  if (error !== null) throw competitionErrorFrom(error);
  return templatesFrom(data);
}
