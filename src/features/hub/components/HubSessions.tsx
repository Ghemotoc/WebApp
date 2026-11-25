/**
 * HubSessions: "Live sessions" on the Writers' hub (GAPS-12h; since user story 1.3 drawn as plain
 * rows, board A03-WritersHub).
 *
 * Each row: the session's title (opening the session in a new tab when it has a link), then
 * "13 Nov · Thursday 18:00 · Romanian · 13+ · Together voice room" on this device's clock, and
 * Remind me at the right. Remind me turns pressed with a tick and "Reminder set" shows under the
 * row: a notification arrives in the hour before the start (story 1.3). Signed-in members only;
 * the server lists only sessions the member is old enough for.
 * Who shows it: WritersHubPage. What it calls: useHubSessions, sessionTime and HubRows.
 */
import { CheckIcon } from '@/components/icons/CheckIcon';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { HubSession } from '../api/hubSessions';
import { useHubSessions, type HubSessionsState } from '../hooks/useHubSessions';
import { sessionStartParts } from '../lib/sessionTime';
import { useHubTranslation } from '../registerHubTranslations';

import { HubRows, type HubRow } from './HubRows';

type Translate = ReturnType<typeof useHubTranslation>['t'];

/**
 * One session as a row: its facts, its link and its Remind me button.
 *
 * @returns the row
 */
function sessionRow(
  session: HubSession,
  state: HubSessionsState,
  t: Translate,
  language: string,
): HubRow {
  // Step 1: the session's words in the interface language.
  const isRomanian = language === 'ro';
  const title = isRomanian ? session.titleRo : session.titleEn;
  const place = isRomanian ? session.placeRo : session.placeEn;
  // Step 2: the day and time on this device's clock, the language, the age group and the place.
  const start = sessionStartParts(session.startsAt, language);
  const facts = [
    { text: `${start.day} ${start.month}` },
    { text: start.weekdayAndTime },
    { text: t(`hub.sessions.language.${session.languageCode}`) },
    { text: t(`hub.sessions.rating.${session.rating}`) },
  ];
  if (place !== '') facts.push({ text: place });
  return {
    key: session.id,
    title,
    href: session.linkUrl ?? undefined,
    outsideLabel: session.linkUrl === null ? undefined : t('hub.sessions.openLabel', { title }),
    facts,
    note: session.isReminded ? (
      <p className="m-0 type-meta text-ink-muted">{t('hub.sessions.reminderSet')}</p>
    ) : undefined,
    action: (
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
    ),
  };
}

/**
 * Renders the sessions.
 *
 * @returns the section, or nothing when no session is coming up
 */
export function HubSessions() {
  const { t, i18n } = useHubTranslation();
  const state = useHubSessions();
  if (state.loadFailed) return <Notice tone="error">{t('hub.sessions.loadFailed')}</Notice>;
  if (state.sessions.length === 0) return null;
  const rows = state.sessions.map((session) => sessionRow(session, state, t, i18n.language));
  return (
    <div id="hub-sessions" className="flex flex-col gap-2">
      <HubRows
        headingId="hub-sessions-heading"
        heading={t('hub.sessions.eyebrow')}
        rows={rows}
        footer={<p className="m-0 mt-2 type-meta text-ink-muted">{t('hub.sessions.timeNote')}</p>}
      />
      <div aria-live="polite">
        {state.changeFailed && <Notice tone="error">{t('hub.sessions.remindFailed')}</Notice>}
      </div>
    </div>
  );
}
