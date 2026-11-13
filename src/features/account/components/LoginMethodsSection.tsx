/**
 * LoginMethodsSection: Settings › Ways to log in (story S1-E2-09; board 6.3, "Ways to log in").
 *
 * What it shows: email and password, Google, Apple, Microsoft (Outlook) and the passkeys, each
 * Connected or Not connected with its button, the age line and how many ways the person has.
 * The last way in can't be disconnected (criterion 3); the board's note says why. A password
 * can't be taken off once set (Supabase Auth keeps it), so its row has no Disconnect; without
 * one, "Set a password" emails a link (docs/board-fixes.md).
 * When it shows: while social_login or passkey_login is on, or once something is connected, so
 * a person can always disconnect what they connected. With both flags off and nothing connected,
 * Settings looks as it did before S1-E2-09.
 * Who shows it: SettingsPage. What it calls: hooks/useLoginMethods.ts.
 */
import { useLoginMethodsTranslation } from '@/features/account/registerLoginMethodsTranslations';

import { Notice } from '@/components/ui/Notice';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';

import { countLoginMethods, type MyLoginMethods } from '../api/loginMethods';
import { useLoginMethodRows } from '../hooks/useLoginMethodRows';
import { useLoginMethods } from '../hooks/useLoginMethods';

import { LoginMethodRow } from './LoginMethodRow';

/** The ID of the note a disabled Disconnect points at. */
const lastWayNoteId = 'last-way-to-log-in';

/** The notes that are good news; the others are drawn as problems. */
const goodNotes = new Set(['passkeyAdded', 'passwordLinkSent']);

/**
 * Says whether a provider or a passkey is connected, so the panel shows even with the flags off.
 *
 * @param methods - the list, or null while it loads
 * @returns true when there is something to disconnect
 */
function hasSomethingConnected(methods: MyLoginMethods | null): boolean {
  return methods !== null && methods.providers.length + methods.passkeys.length > 0;
}

/**
 * "You have 3 ways to log in.", or, when the only way in is one that could be disconnected, why
 * it can't go. Disabled Disconnect buttons point here (aria-describedby). A password alone needs
 * no warning: it has no Disconnect.
 *
 * @param props.methods - the list
 * @returns the note
 */
function WaysCount({ methods }: { methods: MyLoginMethods }) {
  const { t } = useLoginMethodsTranslation();
  const count = countLoginMethods(methods);
  const isLast = count === 1 && !methods.hasPassword;
  return (
    <p
      id={lastWayNoteId}
      role="status"
      className={isLast ? 'm-0 text-sm font-semibold text-destructive' : 'm-0 text-sm text-meta'}
    >
      {isLast ? t('lastWay') : t('count', { count })}
    </p>
  );
}

/**
 * Renders the panel, or nothing while it doesn't apply.
 *
 * @returns the Ways to log in section
 */
export function LoginMethodsSection() {
  const { t } = useLoginMethodsTranslation();
  const flags = useFeatureFlags();
  const login = useLoginMethods();
  const isSocialLoginOn = flags.isOn('social_login', false);
  const isPasskeyLoginOn = flags.isOn('passkey_login', false);
  const rows = useLoginMethodRows(login, { isSocialLoginOn, isPasskeyLoginOn, lastWayNoteId });
  const { methods } = login;
  if (!isSocialLoginOn && !isPasskeyLoginOn && !hasSomethingConnected(methods)) return null;

  return (
    <section
      id="ways-to-log-in"
      aria-labelledby="settings-login-methods-heading"
      className="flex scroll-mt-24 flex-col gap-4 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
    >
      <h2
        id="settings-login-methods-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {t('heading')}
      </h2>
      <p className="m-0 text-body">{t('intro')}</p>
      <p className="m-0 rounded-2xl bg-tint px-4 py-3 text-sm text-body">{t('ageLine')}</p>
      {login.loadFailed && <Notice tone="error">{t('loadFailed')}</Notice>}
      <ul
        aria-label={t('listLabel')}
        className="m-0 list-none rounded-2xl border border-border p-0"
      >
        {rows.map(({ key, ...row }) => (
          <LoginMethodRow key={key} {...row} isBusy={login.isBusy} />
        ))}
      </ul>
      {methods !== null && <WaysCount methods={methods} />}
      {login.note !== null && (
        <Notice tone={goodNotes.has(login.note) ? 'success' : 'error'}>
          {t(`notes.${login.note}`)}
        </Notice>
      )}
    </section>
  );
}
