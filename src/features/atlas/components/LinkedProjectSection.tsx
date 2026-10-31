/**
 * LinkedProjectSection: a link to one of the writer's projects outside the platform (story S1-E17-04).
 *
 * A name and a web address, each saving by itself; an address that isn't http or https waits
 * with a plain message and is never sent (the database refuses it too). Once both are saved,
 * "Open <name>" opens it in a new tab with rel="noopener" (and "noreferrer", so the other site
 * isn't told where the writer came from), and says that it opens a new tab.
 * Who uses it: StoryAtlasPage. What it calls: useStoryPlan's savePlan, lib/linkedProject.ts.
 */
import { FormSection } from '@/features/writing/components/FormSection';

import type { PlanFields, StoryPlanPage } from '../api/storyPlans';
import { isLinkableAddress } from '../lib/linkedProject';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PlanTextField } from './PlanTextField';

/** What the section needs. */
export interface LinkedProjectSectionProps {
  page: StoryPlanPage;
  savePlan: <Field extends keyof PlanFields>(
    field: Field,
    value: PlanFields[Field],
  ) => Promise<void>;
}

/** "Open <name>", once a name and an address are saved. */
function OpenLinkedProject({ label, address }: { label: string; address: string }) {
  const { t } = useAtlasTranslation();
  if (label === '' || address === '' || !isLinkableAddress(address)) return null;
  return (
    <a
      href={address}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center self-start text-sm font-semibold break-words"
    >
      {t('linked.open', { label })} <span className="sr-only">{t('linked.newTab')}</span>
    </a>
  );
}

/**
 * Renders the section.
 *
 * @returns the "Linked project" card
 */
export function LinkedProjectSection({ page, savePlan }: LinkedProjectSectionProps) {
  const { t } = useAtlasTranslation();
  return (
    <FormSection legend={t('linked.heading')}>
      <p className="m-0 text-sm text-meta">{t('linked.hint')}</p>
      <PlanTextField
        id="atlas-linked-label"
        label={t('linked.label')}
        maxLength={60}
        savedValue={page.plan.linkedProjectLabel}
        save={async (label) => savePlan('linkedProjectLabel', label.trim())}
      />
      <PlanTextField
        id="atlas-linked-address"
        label={t('linked.address')}
        hint={t('linked.addressHint')}
        type="url"
        maxLength={2000}
        isValid={(address) => isLinkableAddress(address.trim())}
        invalidMessage={t('linked.invalid')}
        savedValue={page.plan.linkedProjectUrl}
        save={async (address) => savePlan('linkedProjectUrl', address.trim())}
      />
      <OpenLinkedProject
        label={page.plan.linkedProjectLabel}
        address={page.plan.linkedProjectUrl}
      />
    </FormSection>
  );
}
