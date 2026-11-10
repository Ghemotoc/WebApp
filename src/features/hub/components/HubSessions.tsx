/**
 * HubSessions: "Live sessions" on the Writers' hub (bundle GAPS-12h; board WritersHub: a date
 * tile, the title, "Thursday 18:00 · Romanian · 13+" and "Remind me").
 *
 * One row per session coming up that fits the member's age group (the database decides,
 * writers_hub_sessions()): the date tile, the title, when it starts on this device's clock, its
 * language and age group, where it happens and, when staff added one, a link to it. "Remind me"
 * is a toggle: pressed, the member gets one notification in the hour before the start. With no
 * session coming up the block stays away.
 * Who shows it: WritersHubPage. What it calls: useHubSessions and lib/sessionTime.ts.
 */
import { CheckIcon } from '@/components/icons/CheckIcon';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { HubSession } from '../api/hubSessions';
import { useHubSessions, type HubSessionsState } from '../hooks/useHubSessions';
import { sessionStartParts } from '../lib/sessionTime';
import { useHubTranslation } from '../registerHubTranslations';

/**
 * The square tile with the session's month and day. Decorative: the row's text line says the
 * weekday and time, and the tile's date is read out as part of the title's row.
 *
 * @param props.month - the short month, "Nov"
 * @param props.day - the day of the month, "13"
 * @returns the tile
 */
function DateTile({ month, day }: { month: string; day: string }) {
  return (
    <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-surface-soft">
      <span className="text-[11px] leading-none font-bold tracking-[0.12em] text-meta uppercase">
        {month}
      </span>
      <span className="font-heading text-xl leading-tight font-bold text-heading">{day}</span>
    </div>
  );
}

/**
 * One session's row.
 *
 * @param props.session - the session
 * @param props.state - the hook's state, for Remind me
 * @returns the list item
 */
function SessionRow({ session, state }: { session: HubSession; state: HubSessionsState }) {
  const { t, i18n } = useHubTranslation();
  // Step 1: the session's words in the interface language.
  const isRomanian = i18n.language === 'ro';
  const title = isRomanian ? session.titleRo : session.titleEn;
  const place = isRomanian ? session.placeRo : session.placeEn;
  // Step 2: the start on this device's clock, then the language and the age group.
  const start = sessionStartParts(session.startsAt, i18n.language);
  const facts = [
    start.weekdayAndTime,
    t(`hub.sessions.language.${session.languageCode}`),
    t(`hub.sessions.rating.${session.rating}`),
  ].join(' · ');
  return (
    <li className="flex min-w-0 flex-wrap items-center gap-4 border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0">
      <DateTile month={start.month} day={start.day} />
      <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
        <h3 className="m-0 font-heading text-[17px] font-bold wrap-anywhere text-heading">
          {title}
        </h3>
        <p className="m-0 text-sm text-body">{facts}</p>
        <p className="m-0 text-sm wrap-anywhere text-meta">
          {place}
          {session.linkUrl !== null && (
            <>
              {' · '}
              <a
                href={session.linkUrl}
                target="_blank"
                rel="nofollow noopener noreferrer"
                aria-label={t('hub.sessions.openLabel', { title })}
                className="text-link underline"
              >
                {t('hub.sessions.open')}
              </a>
            </>
          )}
        </p>
        {session.isReminded && (
          <p className="m-0 text-[13px] text-meta">{t('hub.sessions.reminderSet')}</p>
        )}
      </div>
      <Button
        variant="secondary"
        aria-pressed={session.isReminded}
        aria-label={t('hub.sessions.remindLabel', { title })}
        disabled={state.isChanging}
        onClick={() => state.remind(session.id, !session.isReminded)}
      >
        {session.isReminded && <CheckIcon />}
        {t('hub.sessions.remind')}
      </Button>
    </li>
  );
}

/**
 * Renders the block under its eyebrow heading.
 *
 * @returns the block, a plain message when the sessions can't be read, or nothing without one
 */
export function HubSessions() {
  const { t } = useHubTranslation();
  const state = useHubSessions();
  if (state.loadFailed) return <Notice tone="error">{t('hub.sessions.loadFailed')}</Notice>;
  if (state.sessions.length === 0) return null;
  return (
    <section
      id="hub-sessions"
      aria-labelledby="hub-sessions-heading"
      className="flex flex-col gap-4"
    >
      <h2 id="hub-sessions-heading" className="eyebrow m-0">
        {t('hub.sessions.eyebrow')}
      </h2>
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card">
        <ul className="m-0 flex min-w-0 list-none flex-col p-0">
          {state.sessions.map((session) => (
            <SessionRow key={session.id} session={session} state={state} />
          ))}
        </ul>
        <div aria-live="polite">
          {state.changeFailed && <Notice tone="error">{t('hub.sessions.remindFailed')}</Notice>}
        </div>
        <p className="m-0 text-[13px] text-meta">{t('hub.sessions.timeNote')}</p>
      </div>
    </section>
  );
}
