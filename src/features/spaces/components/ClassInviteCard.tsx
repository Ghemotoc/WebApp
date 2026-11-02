/**
 * ClassInviteCard: "Invite code" in a class space's settings (bundle CLASSES, part a; story
 * S1-E8-11 criterion 4: an invite code and link the teacher can reset at any time, which stop
 * working after the period the teacher sets).
 *
 * What it shows: whether a code works now ("Works until 2 December · 12 of 40 places used") or
 * that there is none; "Works for" and "Places"; "Make a code" (or "Make a new code", which says
 * the old one stops); "Stop the code"; and, once made, the code and its link shown this once
 * (NewClassInviteCode). Staff screens style: plain, no doodles.
 * Who shows it: SpaceSettingsPage, for a class space, to whoever may manage its members (the
 * teacher, a space moderator with the members power, our moderation team). What it calls:
 * useClassInvite → class_invite(); useClassInviteChanges → make_class_invite() and
 * end_class_invite().
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { ClassInviteStatus } from '../api/classSpaces';
import type { Space } from '../api/spaces';
import { useClassInvite, useClassInviteChanges } from '../hooks/useClassSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { ClassInviteFields, type ClassInviteValues } from './ClassInviteFields';
import { NewClassInviteCode } from './NewClassInviteCode';
import { SpaceFormCard } from './SpaceFormCard';

/**
 * The line saying whether a code works now.
 *
 * @param props.status - the working code, or null
 * @returns the line
 */
function InviteStatusLine({ status }: { status: ClassInviteStatus | null }) {
  const { t, i18n } = useSpacesTranslation();
  if (status === null) return <p className="m-0 text-body">{t('classInvite.none')}</p>;
  const until = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(
    new Date(status.expiresAt),
  );
  return (
    <p className="m-0 text-body">
      {t('classInvite.working', { until, used: status.used, count: status.admits })}
    </p>
  );
}

/**
 * "Make a code" (or "Make a new code") and, while a code works, "Stop the code".
 *
 * @param props.hasCode - whether a code works now
 * @param props.isRunning - true while a change is on its way
 * @param props.onEnd - stops the working code
 * @returns the button row
 */
function InviteButtons({
  hasCode,
  isRunning,
  onEnd,
}: {
  hasCode: boolean;
  isRunning: boolean;
  onEnd: () => void;
}) {
  const { t } = useSpacesTranslation();
  return (
    <div className="flex flex-wrap gap-3">
      <Button type="submit" disabled={isRunning}>
        {t(hasCode ? 'classInvite.makeNew' : 'classInvite.make')}
      </Button>
      {hasCode && (
        <Button variant="secondary" disabled={isRunning} onClick={onEnd}>
          {t('classInvite.stop')}
        </Button>
      )}
    </div>
  );
}

/**
 * Renders the card.
 *
 * @param props.space - the class space
 * @returns the card
 */
export function ClassInviteCard({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const status = useClassInvite(space.slug);
  const changes = useClassInviteChanges(space.slug);
  const [values, setValues] = useState<ClassInviteValues>({ validDays: '30', admits: '40' });
  const [problem, setProblem] = useState<string | null>(null);
  const working = status.data ?? null;

  /** Checks the number of places in plain words, then asks the database for a new code. */
  async function makeCode(event: FormEvent) {
    event.preventDefault();
    const admits = Number(values.admits);
    if (!Number.isInteger(admits) || admits < 1 || admits > 200) {
      return setProblem(t('classInvite.placesOutOfRange'));
    }
    setProblem(null);
    // A refusal shows from changes.failure; nothing else to do here.
    await changes.make({ validDays: Number(values.validDays), admits }).catch(() => undefined);
  }

  return (
    <SpaceFormCard
      eyebrow={t('classInvite.eyebrow')}
      title={t('classInvite.title')}
      intro={t('classInvite.intro')}
      headingLevel="h2"
      headingId="class-invite-heading"
    >
      {status.isError && <Notice tone="error">{t('classInvite.loadFailed')}</Notice>}
      {status.data !== undefined && <InviteStatusLine status={working} />}
      {changes.made !== null && (
        <NewClassInviteCode
          invite={changes.made}
          className={space.name}
          onDismiss={changes.forget}
        />
      )}
      <form
        noValidate
        onSubmit={makeCode}
        aria-labelledby="class-invite-heading"
        className="flex flex-col gap-4"
      >
        <ClassInviteFields values={values} onChange={setValues} />
        {working !== null && <p className="m-0 text-sm text-meta">{t('classInvite.resetNote')}</p>}
        {problem !== null && <Notice tone="error">{problem}</Notice>}
        {changes.failure !== null && (
          <Notice tone="error">{t(`classInvite.failures.${changes.failure.failure}`)}</Notice>
        )}
        <InviteButtons
          hasCode={working !== null}
          isRunning={changes.isRunning}
          onEnd={() => void changes.end().catch(() => undefined)}
        />
      </form>
    </SpaceFormCard>
  );
}
