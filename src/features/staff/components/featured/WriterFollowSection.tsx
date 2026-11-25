/**
 * WriterFollowSection: where an admin or the owner picks "To follow this week", the first list in
 * the Read page's Writers box (user story 1.4, board A04; Robert, 25 Nov 2026: every widget the
 * boards draw is editable from the admin site).
 *
 * Staff type up to three usernames in order and a reason, then save. With no picks the Read page
 * shows the writers who gained the most followers this week, so the list is never empty by
 * mistake. A picked writer who can't be suggested today (suspended, suggestions turned off, under
 * 16 without the parent's yes) is marked and left out for readers until that changes.
 * Who shows it: FeaturedPage, under the Featured picks (the same "featured" area: owner and
 * admin; the database refuses everyone else). What it calls: useWriterFollowPicks.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';

import { handlesFromText, type WriterFollowPick } from '../../api/writerFollowPicks';
import { useWriterFollowPicks } from '../../hooks/useWriterFollowPicks';

/**
 * The current picks, or the line saying the automatic list is showing.
 *
 * @param props.picks - the current picks, in order
 * @returns the list or the line
 */
function CurrentPicks({ picks }: { picks: WriterFollowPick[] }) {
  const { t } = useTranslation('staff');
  if (picks.length === 0) return <p className="m-0 text-body">{t('featured.writers.automatic')}</p>;
  return (
    <ol className="m-0 list-none p-0" aria-label={t('featured.writers.currentLabel')}>
      {picks.map((pick, index) => (
        <li
          key={pick.handle}
          className="flex flex-wrap items-center gap-2 border-b border-hairline py-2"
        >
          <span className="w-6 text-meta">{index + 1}.</span>
          <span className="font-semibold break-words text-heading">{pick.displayName}</span>
          <span className="text-meta">@{pick.handle}</span>
          {!pick.mayShow && <InfoPill tone="gold">{t('featured.writers.cannotShow')}</InfoPill>}
        </li>
      ))}
    </ol>
  );
}

/** useWriterFollowPicks's result, passed down once. */
type WriterFollowState = ReturnType<typeof useWriterFollowPicks>;

/**
 * The form: usernames in order, a reason and Save.
 *
 * @param props.state - the picks and the save
 * @param props.picks - the current picks, to fill the field the first time
 * @returns the form
 */
function WriterFollowForm({
  state,
  picks,
}: {
  state: WriterFollowState;
  picks: WriterFollowPick[];
}) {
  const { t } = useTranslation('staff');
  const [typed, setTyped] = useState(() => picks.map((pick) => `@${pick.handle}`).join(', '));
  const [reason, setReason] = useState('');
  // Step 1: Save sends the usernames in the order typed; an empty field clears the picks.
  const submit = (event: FormEvent) => {
    event.preventDefault();
    state.save({ handles: handlesFromText(typed), reason });
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <TextInput
        id="writer-follow-handles"
        label={t('featured.writers.handles')}
        hint={t('featured.writers.handlesHint')}
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        autoComplete="off"
      />
      <Textarea
        id="writer-follow-reason"
        label={t('featured.writers.reason')}
        hint={t('featured.picks.reasonHint')}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={2}
        required
      />
      <div aria-live="polite">
        {state.saveFailure !== null && (
          <Notice tone="error">{t(`featured.writers.failures.${state.saveFailure}`)}</Notice>
        )}
        {state.hasSaved && <Notice tone="success">{t('featured.writers.saved')}</Notice>}
      </div>
      <Button
        type="submit"
        disabled={state.isSaving || reason.trim() === ''}
        className="self-start"
      >
        {t('featured.writers.save')}
      </Button>
    </form>
  );
}

/**
 * Renders the section.
 *
 * @returns the section, or nothing for staff the database refuses (the page above already says
 *   who can pick)
 */
export function WriterFollowSection() {
  const { t } = useTranslation('staff');
  const state = useWriterFollowPicks();
  if (state.loadFailure === 'not_allowed') return null;
  return (
    <section
      aria-labelledby="featured-writers-heading"
      className="flex max-w-[820px] flex-col gap-4 rounded-card border border-border bg-surface p-5"
    >
      <h2 id="featured-writers-heading" className="m-0 font-heading text-xl font-bold text-heading">
        {t('featured.writers.heading')}
      </h2>
      <p className="m-0 text-body">{t('featured.writers.intro')}</p>
      {state.loadFailure !== null && (
        <Notice tone="error">{t('featured.writers.failures.unreachable')}</Notice>
      )}
      {state.picks === null && state.loadFailure === null && (
        <p className="m-0 text-body">{t('featured.writers.loading')}</p>
      )}
      {state.picks !== null && (
        <>
          <CurrentPicks picks={state.picks} />
          <WriterFollowForm state={state} picks={state.picks} />
        </>
      )}
    </section>
  );
}
