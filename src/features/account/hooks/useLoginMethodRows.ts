/**
 * useLoginMethodRows: the rows of Settings › Ways to log in, worked out from the list and the
 * flags (story S1-E2-09; board 6.3).
 *
 * Who calls it: LoginMethodsSection. What it returns: one LoginMethodRow's props per row, in the
 * board's order: email and password, Google, Apple, Microsoft, then the passkeys.
 * The rules:
 * - a provider shows while social_login is on, or while it is connected (so it can be removed);
 * - "Add a passkey" shows while passkey_login is on; each saved passkey always shows;
 * - Disconnect is disabled on the last way in (criterion 3).
 */
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import appleLogo from '@/assets/brands/apple.svg';
import googleLogo from '@/assets/brands/google.svg';
import microsoftLogo from '@/assets/brands/microsoft.svg';
import { socialProviders, type SocialProvider } from '@/features/auth/api/socialSignIn';
import { formatRomaniaDate } from '@/lib/romania-time';

import { countLoginMethods, type MyLoginMethods, type MyPasskey } from '../api/loginMethods';
import type { LoginMethodAction, LoginMethodIcon } from '../components/LoginMethodRow';

import type { useLoginMethods } from './useLoginMethods';

/** One row's props, with its key. */
export interface LoginMethodRowData {
  key: string;
  icon: LoginMethodIcon;
  name: string;
  detail: string;
  isConnected: boolean | null;
  action: LoginMethodAction | null;
}

/** What decides which rows show. */
interface RowSettings {
  isSocialLoginOn: boolean;
  isPasskeyLoginOn: boolean;
  /** The note a disabled Disconnect points at. */
  lastWayNoteId: string;
}

/** Each provider's logo and its text group under loginMethods in account.json. */
const providerParts: Record<SocialProvider, { logo: string; textKey: string }> = {
  google: { logo: googleLogo, textKey: 'google' },
  apple: { logo: appleLogo, textKey: 'apple' },
  azure: { logo: microsoftLogo, textKey: 'microsoft' },
};

/** An empty list while it loads, so the rows can be drawn at once. */
const noMethods: MyLoginMethods = { hasPassword: false, providers: [], passkeys: [] };

/** What every row builder needs. */
interface RowContext {
  t: TFunction;
  language: string;
  methods: MyLoginMethods;
  login: ReturnType<typeof useLoginMethods>;
  /** The note's ID while only one way in is left, so Disconnect is disabled; null otherwise. */
  blockedBy: string | null;
}

/**
 * A Disconnect button.
 *
 * @param context - the row context
 * @param what - the way's name, for the accessible name ("Disconnect Google")
 * @param onPress - what it does
 * @returns the action
 */
function disconnectAction(
  context: RowContext,
  what: string,
  onPress: () => void,
): LoginMethodAction {
  return {
    label: context.t('loginMethods.disconnect'),
    accessibleName: context.t('loginMethods.disconnectNamed', { what }),
    onPress,
    isRemoval: true,
    disabledBecauseOf: context.blockedBy,
  };
}

/**
 * A button that adds a way in.
 *
 * @param label - its text
 * @param accessibleName - its name for screen readers, starting with the text
 * @param onPress - what it does
 * @returns the action
 */
function addAction(label: string, accessibleName: string, onPress: () => void): LoginMethodAction {
  return { label, accessibleName, onPress, isRemoval: false, disabledBecauseOf: null };
}

/**
 * Step 1: email and password; "Set a password" when there is none.
 *
 * @param context - the row context
 * @returns the row
 */
function emailRowOf({ t, methods, login }: RowContext): LoginMethodRowData {
  const setPasswordLabel = t('loginMethods.email.setPassword');
  return {
    key: 'email',
    icon: { lineIcon: 'mail' },
    name: t('loginMethods.email.name'),
    detail: methods.hasPassword
      ? t('loginMethods.email.detailOn')
      : t('loginMethods.email.detailOff'),
    isConnected: methods.hasPassword,
    action: methods.hasPassword
      ? null
      : addAction(setPasswordLabel, setPasswordLabel, login.setPassword),
  };
}

/**
 * Step 2: one provider's row.
 *
 * @param context - the row context
 * @param provider - the provider
 * @returns the row
 */
function providerRowOf(context: RowContext, provider: SocialProvider): LoginMethodRowData {
  const { t, methods, login } = context;
  const { logo, textKey } = providerParts[provider];
  const name = t(`loginMethods.${textKey}.name`);
  const isConnected = methods.providers.includes(provider);
  const connectName = t('loginMethods.connectNamed', { what: name });
  return {
    key: provider,
    icon: { brandLogo: logo },
    name,
    detail: t(`loginMethods.${textKey}.detail`),
    isConnected,
    action: isConnected
      ? disconnectAction(context, name, () => login.disconnect(provider))
      : addAction(t('loginMethods.connect'), connectName, () => login.connect(provider)),
  };
}

/**
 * Step 3: one saved passkey's row.
 *
 * @param context - the row context
 * @param passkey - the passkey
 * @returns the row
 */
function passkeyRowOf(context: RowContext, passkey: MyPasskey): LoginMethodRowData {
  const { t, language, login } = context;
  const added = formatRomaniaDate(new Date(passkey.createdAt), language);
  const detail = passkey.name ?? t('loginMethods.passkey.addedOn', { date: added });
  const what = t('loginMethods.passkey.named', { detail });
  return {
    key: passkey.id,
    icon: { lineIcon: 'lock' },
    name: t('loginMethods.passkey.name'),
    detail,
    isConnected: true,
    action: disconnectAction(context, what, () => login.removePasskey(passkey.id)),
  };
}

/**
 * Step 4: "Add a passkey", or "Add another passkey" once there is one.
 *
 * @param context - the row context
 * @returns the row
 */
function addPasskeyRowOf({ t, methods, login }: RowContext): LoginMethodRowData {
  const hasPasskeys = methods.passkeys.length > 0;
  const label = hasPasskeys ? t('loginMethods.passkey.addAnother') : t('loginMethods.passkey.add');
  return {
    key: 'add-passkey',
    icon: { lineIcon: 'lock' },
    name: hasPasskeys ? t('loginMethods.passkey.anotherName') : t('loginMethods.passkey.name'),
    detail: t('loginMethods.passkey.detail'),
    isConnected: hasPasskeys ? null : false,
    action: addAction(label, label, login.addPasskey),
  };
}

/**
 * Works out the rows.
 *
 * @param login - useLoginMethods's result
 * @param settings - the flags and the note's ID
 * @returns the rows
 */
export function useLoginMethodRows(
  login: ReturnType<typeof useLoginMethods>,
  settings: RowSettings,
): LoginMethodRowData[] {
  const { t, i18n } = useTranslation('account');
  const methods = login.methods ?? noMethods;
  const context: RowContext = {
    t,
    language: i18n.language,
    methods,
    login,
    // The last way in can't be disconnected: its button points at the note instead.
    blockedBy: countLoginMethods(methods) === 1 ? settings.lastWayNoteId : null,
  };
  const shownProviders = socialProviders.filter(
    (provider) => settings.isSocialLoginOn || methods.providers.includes(provider),
  );
  return [
    emailRowOf(context),
    ...shownProviders.map((provider) => providerRowOf(context, provider)),
    ...methods.passkeys.map((passkey) => passkeyRowOf(context, passkey)),
    ...(settings.isPasskeyLoginOn ? [addPasskeyRowOf(context)] : []),
  ];
}
