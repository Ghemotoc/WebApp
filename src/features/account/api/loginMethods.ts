/**
 * Settings › Ways to log in: the list, and connecting or disconnecting each way (story S1-E2-09).
 *
 * Who calls it: hooks/useLoginMethods.ts.
 * What it calls next:
 * - my_login_methods() (…_s1_e2_09_ways_to_log_in.sql): whether there is a password, which
 *   providers are connected and the passkeys, never a provider's email;
 * - connecting a provider: expect_identity_link() first, because a provider may join an account
 *   that is already set up only when asked for from here (criterion 5), then Supabase Auth's
 *   linkIdentity(), which leaves for the provider and comes back to /auth/social-return?mode=link;
 * - disconnecting: Supabase Auth's unlinkIdentity(); passkeys: registerPasskey() and
 *   passkey.delete(); "Set a password": the reset email of S1-E2-05.
 * Each change is notified and emailed by the database (notify_login_method_change()).
 * Privacy: nothing here is logged (CLAUDE.md rule 12).
 */
import type { AppSupabaseClient } from '@/lib/supabase';
import { sendResetLink } from '@/features/auth/api/signIn';
import {
  isClosedPasskeyPrompt,
  scopesFor,
  socialReturnAddress,
  type SocialProvider,
} from '@/features/auth/api/socialSignIn';

/** One passkey, as my_login_methods() lists it. */
export interface MyPasskey {
  id: string;
  name: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

/** The signed-in person's ways to log in. */
export interface MyLoginMethods {
  hasPassword: boolean;
  providers: SocialProvider[];
  passkeys: MyPasskey[];
}

/** my_login_methods()'s answer, as the database writes it. */
interface LoginMethodsReply {
  outcome?: string;
  has_password?: boolean;
  providers?: string[];
  passkeys?: { id: string; name: string | null; created_at: string; last_used_at: string | null }[];
}

/** The providers this screen knows; any other identity (email) is not a provider. */
const knownProviders = new Set<string>(['google', 'apple', 'azure']);

/**
 * Loads the ways to log in.
 *
 * @param client - the shared Supabase client
 * @returns the list
 * Errors: throws when the database can't be reached or the person is signed out.
 */
export async function fetchMyLoginMethods(client: AppSupabaseClient): Promise<MyLoginMethods> {
  const { data, error } = await client.rpc('my_login_methods');
  if (error !== null) throw new Error(`Could not load the ways to log in: ${error.message}`);
  const reply = data as LoginMethodsReply;
  if (reply.outcome !== 'ok') throw new Error('Signed out.');
  return {
    hasPassword: reply.has_password === true,
    providers: (reply.providers ?? []).filter((provider): provider is SocialProvider =>
      knownProviders.has(provider),
    ),
    passkeys: (reply.passkeys ?? []).map((passkey) => ({
      id: passkey.id,
      name: passkey.name,
      createdAt: passkey.created_at,
      lastUsedAt: passkey.last_used_at,
    })),
  };
}

/**
 * How many ways in there are: the password, each provider and each passkey.
 *
 * @param methods - the list
 * @returns the count
 */
export function countLoginMethods(methods: MyLoginMethods): number {
  return (methods.hasPassword ? 1 : 0) + methods.providers.length + methods.passkeys.length;
}

/**
 * Connects a provider: says it is expected, then leaves for the provider.
 *
 * @param client - the shared Supabase client
 * @param provider - the provider
 * Errors: throws when the database or Supabase Auth refuses to start.
 */
export async function connectProvider(
  client: AppSupabaseClient,
  provider: SocialProvider,
): Promise<void> {
  // Step 1: the request that lets guard_identity_link() accept this provider for ten minutes.
  const expected = await client.rpc('expect_identity_link', { wanted_provider: provider });
  if (expected.error !== null) throw new Error(`Could not prepare: ${expected.error.message}`);
  // Step 2: off to the provider; it sends the person back to the return page.
  const { error } = await client.auth.linkIdentity({
    provider,
    options: { redirectTo: socialReturnAddress('link'), scopes: scopesFor(provider) },
  });
  if (error !== null) throw new Error(`Could not connect: ${error.code ?? error.message}`);
}

/**
 * Disconnects a provider.
 *
 * @param client - the shared Supabase client
 * @param provider - the provider
 * @returns 'disconnected', or 'last_way' when Supabase Auth refuses to remove the only identity
 * Errors: throws when Supabase Auth can't be reached.
 */
export async function disconnectProvider(
  client: AppSupabaseClient,
  provider: SocialProvider,
): Promise<'disconnected' | 'last_way'> {
  const identities = await client.auth.getUserIdentities();
  if (identities.error !== null) throw new Error(`Could not read: ${identities.error.message}`);
  const identity = identities.data.identities.find((each) => each.provider === provider);
  if (identity === undefined) return 'disconnected';
  const { error } = await client.auth.unlinkIdentity(identity);
  // Supabase Auth's own rule: an account always keeps one identity.
  if (error?.code === 'single_identity_not_deletable') return 'last_way';
  if (error !== null) throw new Error(`Could not disconnect: ${error.code ?? error.message}`);
  return 'disconnected';
}

/**
 * Adds a passkey on this device: the browser asks for the fingerprint, face or device PIN.
 *
 * @param client - the shared Supabase client
 * @returns 'added', or 'cancelled' when the person closed the browser's prompt
 * Errors: throws for any other failure.
 */
export async function addPasskey(client: AppSupabaseClient): Promise<'added' | 'cancelled'> {
  const { error } = await client.auth.registerPasskey();
  if (error === null) return 'added';
  if (isClosedPasskeyPrompt(error)) return 'cancelled';
  throw new Error(`Could not add the passkey: ${error.message}`);
}

/**
 * Removes one passkey. The device keeps its copy, but it no longer opens this account.
 *
 * @param client - the shared Supabase client
 * @param passkeyId - from the list
 * Errors: throws when Supabase Auth refuses.
 */
export async function removePasskey(client: AppSupabaseClient, passkeyId: string): Promise<void> {
  const { error } = await client.auth.passkey.delete({ passkeyId });
  if (error !== null) throw new Error(`Could not remove the passkey: ${error.message}`);
}

/**
 * "Set a password": emails the person a link to choose one, as "Forgot your password?" does.
 *
 * @param client - the shared Supabase client
 * @returns 'sent' or 'too_many_attempts'
 * Errors: throws when the account has no email or Supabase can't be reached.
 */
export async function sendSetPasswordLink(
  client: AppSupabaseClient,
): Promise<'sent' | 'too_many_attempts'> {
  const { data, error } = await client.auth.getUser();
  const email = data.user?.email;
  if (error !== null || email === undefined) throw new Error('Could not read the account.');
  return sendResetLink(client, email);
}
