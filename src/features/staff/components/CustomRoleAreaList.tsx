/**
 * CustomRoleAreaList: "Access in each area" in the custom role form (story S1-E11-33, bundle
 * CMS-2a): one drop-down per admin area with None, View or Change.
 *
 * It offers only the areas the signed-in person may give, and Change only where they hold Change
 * themselves; the database checks it again (custom_role_area_problem()). An area the role already
 * holds but the person may no longer give stays listed, so a change never drops it silently.
 * Who shows it: CustomRoleForm. What it calls: the onChange it is given.
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';

import type { AssignableArea, CustomRoleAccess, CustomRoleArea } from '../api/customRoles';

/** None on screen: the area isn't in the role. */
const noAccess = 'none';

/** What the list needs. */
interface CustomRoleAreaListProps {
  assignable: AssignableArea[];
  chosen: CustomRoleArea[];
  onChange: (areas: CustomRoleArea[]) => void;
}

/**
 * The areas to list: those the person may give, plus any the role holds that they may not.
 *
 * @param assignable - what the person may give
 * @param chosen - the role's areas now
 * @returns one entry per area, with the most the person may pick in it
 */
function listedAreas(assignable: AssignableArea[], chosen: CustomRoleArea[]): AssignableArea[] {
  const known = new Set(assignable.map((entry) => entry.area));
  const extra = chosen
    .filter((entry) => !known.has(entry.area))
    .map((entry) => ({ area: entry.area, highest: entry.access }));
  return [...assignable, ...extra];
}

/**
 * The role's areas with one area set to a new level (or left out for None).
 *
 * @param chosen - the role's areas now
 * @param area - the area that changed
 * @param picked - 'none', 'view' or 'act'
 * @returns the new list, in the same order
 */
function withAccess(chosen: CustomRoleArea[], area: string, picked: string): CustomRoleArea[] {
  const others = chosen.filter((entry) => entry.area !== area);
  if (picked === noAccess) return others;
  return [...others, { area, access: picked as CustomRoleAccess }];
}

/**
 * Renders the list.
 *
 * @returns a fieldset of drop-downs
 */
export function CustomRoleAreaList({ assignable, chosen, onChange }: CustomRoleAreaListProps) {
  const { t } = useTranslation('staff');
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="eyebrow mb-1 p-0">{t('customRoles.areasLegend')}</legend>
      <p id="custom-role-areas-hint" className="m-0 text-sm text-meta">
        {t('customRoles.areasHint')}
      </p>
      <ul className="m-0 flex list-none flex-col p-0">
        {listedAreas(assignable, chosen).map((entry) => {
          const current = chosen.find((item) => item.area === entry.area)?.access ?? noAccess;
          // Change is offered only where the person holds Change themselves.
          const options = [
            { value: noAccess, label: t('customRoles.accessNone') },
            { value: 'view', label: t('customRoles.accessView') },
            ...(entry.highest === 'act'
              ? [{ value: 'act', label: t('customRoles.accessAct') }]
              : []),
          ];
          return (
            <li
              key={entry.area}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-2 last:border-b-0"
            >
              {/* The drop-down carries the same name for screen readers, so this copy is hidden from them. */}
              <span aria-hidden="true" className="text-body">
                {t(`areaNames.${entry.area}`, { defaultValue: entry.area })}
              </span>
              <Select
                id={`custom-role-access-${entry.area}`}
                label={t(`areaNames.${entry.area}`, { defaultValue: entry.area })}
                descriptionId="custom-role-areas-hint"
                value={current}
                onChange={(picked) => onChange(withAccess(chosen, entry.area, picked))}
                options={options}
              />
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
