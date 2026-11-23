/**
 * ClassLockCard: "When the class locks" in a class space's settings (bundle CLASSES, part b; story
 * S1-E8-11: at the end of the school year a class space locks, so nobody can post, and every
 * member can still read it; board ClassSpace, "Lock the space now" and "Unlock the space").
 *
 * What it shows: the moment the space locks (new classes lock on the next 1 July), the shared
 * date and time field to change it (CALM-7d: a date, a time and the viewer's own time zone, as
 * every member date field since CALM-1c), "Lock the space now", and once locked, a note and
 * "Unlock the space" (not for an archived class, which stays locked for good: CLASSES-d). Plain
 * card style, no doodles.
 * Who shows it: SpaceSettingsPage, for a class space, to whoever holds its settings power (the
 * teacher, a space moderator given it, our moderation team). The database checks again.
 * What it calls: useClassLock → set_class_lock(); the lock helpers in api/classTools.ts and
 * DateTimeField.
 */
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Notice } from '@/components/ui/Notice';
import { deviceTimeZone } from '@/lib/local-time';

import { lockFieldsOf, lockMomentText, lockTimeOf } from '../api/classTools';
import type { Space } from '../api/spaces';
import { useClassLock } from '../hooks/useClassTools';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceFormCard } from './SpaceFormCard';

/** The lock call, as useClassLock() gives it. */
type Locking = ReturnType<typeof useClassLock>;

/**
 * The date form and "Lock the space now", for a class that isn't locked yet.
 *
 * @param props.space - the class space
 * @param props.locking - the lock call
 * @param props.onSaved - called after a change is saved
 * @returns the form
 */
function LockDateForm({
  space,
  locking,
  onSaved,
}: {
  space: Space;
  locking: Locking;
  onSaved: () => void;
}) {
  const { t, i18n } = useSpacesTranslation();
  const [fields, setFields] = useState(lockFieldsOf(space.locksAt));

  /** Saves the picked moment (or no date, which leaves the class unlocked with no date). */
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const changed = await locking.change(lockTimeOf(fields)).catch(() => null);
    if (changed !== null) onSaved();
  }

  /** Locks the class at once: a time in the past locks it now. */
  async function lockNow() {
    const changed = await locking.change(new Date().toISOString()).catch(() => null);
    if (changed !== null) onSaved();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={save}>
      <p className="m-0 text-ink-muted">
        {space.locksAt === null
          ? t('classLock.noDate')
          : t('classLock.locksOn', { date: lockMomentText(space.locksAt, i18n.language) })}
      </p>
      <DateTimeField
        id="class-lock"
        value={fields}
        onChange={setFields}
        dateLabel={t('classLock.date')}
        timeLabel={t('classLock.time')}
        note={t('classLock.dateHint', { zone: deviceTimeZone() })}
        skippedHourNote={(time) => t('classLock.skippedHourNote', { time })}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={locking.isRunning}>
          {t('classLock.saveDate')}
        </Button>
        <Button variant="secondary" disabled={locking.isRunning} onClick={lockNow}>
          {t('classLock.lockNow')}
        </Button>
      </div>
    </form>
  );
}

/**
 * Renders the card.
 *
 * @param props.space - the class space
 * @returns the card
 */
export function ClassLockCard({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const locking = useClassLock(space.slug);
  const [isSaved, setIsSaved] = useState(false);

  /** Unlocks the class (no date), then says so. */
  async function unlock() {
    setIsSaved(false);
    const changed = await locking.change(null).catch(() => null);
    if (changed !== null) setIsSaved(true);
  }

  return (
    <SpaceFormCard
      eyebrow={t('classLock.eyebrow')}
      title={t('classLock.title')}
      headingLevel="h2"
      headingId="class-lock-heading"
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 text-ink-muted">{t('classLock.intro')}</p>
        {space.isLocked ? (
          <>
            <Notice tone="info">{t('classLock.locked')}</Notice>
            {space.isArchived ? (
              <p className="m-0 text-ink-muted">{t('classLock.archivedNote')}</p>
            ) : (
              <Button
                variant="secondary"
                className="self-start"
                disabled={locking.isRunning}
                onClick={unlock}
              >
                {t('classLock.unlock')}
              </Button>
            )}
          </>
        ) : (
          <LockDateForm
            key={space.locksAt ?? 'none'}
            space={space}
            locking={locking}
            onSaved={() => setIsSaved(true)}
          />
        )}
        <div aria-live="polite">
          {locking.failure !== null && (
            <Notice tone="error">{t(`classLock.failures.${locking.failure.failure}`)}</Notice>
          )}
          {isSaved && locking.failure === null && (
            <Notice tone="success">{t('classLock.saved')}</Notice>
          )}
        </div>
      </div>
    </SpaceFormCard>
  );
}
