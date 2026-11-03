/**
 * NewContestForm: starts a contest on a contest landing page that has none yet (story S1-E11-15
 * criterion 1; bundle CONTESTS-13b1).
 *
 * Every contest is presented by one landing page of type contest (S1-E11-14), so the admin picks
 * the page first and fills in the details in the editor. When there is no free contest page, the
 * form says to make one in Website › Landing pages.
 * Who shows it: StaffContestsPage. What it calls: create() from useStaffContests().
 */
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';

import type { useStaffContests } from '../../hooks/useStaffContests';
import { useContestTranslation } from '../../registerContestTranslations';

/** What the form needs. */
interface NewContestFormProps {
  staff: ReturnType<typeof useStaffContests>;
  /** Opens the new contest in the editor. */
  onCreated: (contestId: string) => void;
}

/**
 * Renders the form.
 *
 * @returns the form, or a line pointing to the landing pages when there is no free page
 */
export function NewContestForm({ staff, onCreated }: NewContestFormProps) {
  const { t } = useContestTranslation();
  const [chosen, setChosen] = useState('');
  const pageSlug = chosen === '' ? (staff.freePages[0]?.slug ?? '') : chosen;
  /** Creates the contest, then opens it. */
  async function submit(event: FormEvent) {
    event.preventDefault();
    const contestId = await staff.create(pageSlug).catch(() => null);
    if (contestId !== null) onCreated(contestId);
  }
  return (
    <form
      noValidate
      aria-labelledby="new-contest-heading"
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5"
    >
      <h2 id="new-contest-heading" className="m-0 font-heading text-[20px] font-bold text-heading">
        {t('staff.new.heading')}
      </h2>
      {staff.freePages.length === 0 ? (
        <p className="m-0 text-sm text-body">
          {t('staff.new.noPages')}{' '}
          <Link to="/staff/website/landing-pages" className="text-link underline">
            {t('staff.new.landingPagesLink')}
          </Link>
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-4">
          <Select
            id="new-contest-page"
            label={t('staff.new.page')}
            isLabelVisible
            value={pageSlug}
            onChange={setChosen}
            options={staff.freePages.map((page) => ({
              value: page.slug,
              label: `/c/${page.slug}`,
            }))}
          />
          <Button type="submit" disabled={staff.isCreating || pageSlug === ''}>
            {t('staff.new.create')}
          </Button>
        </div>
      )}
      <div aria-live="polite">
        {staff.createFailure !== null && (
          <Notice tone="error">
            {t(`staff.new.failures.${staff.createFailure.reason}`, {
              defaultValue: t('staff.new.failures.failed'),
            })}
          </Notice>
        )}
      </div>
    </form>
  );
}
