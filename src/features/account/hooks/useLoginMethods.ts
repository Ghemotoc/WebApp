/**
 * useLoginMethods: Settings › Ways to log in, its list and its actions (story S1-E2-09).
 *
 * Who calls it: LoginMethodsSection. What it calls: api/loginMethods.ts.
 * After every change the list is read again, so a row shows its new state; connecting a provider
 * leaves the page instead, and the list is read when the person is back.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useSession } from '@/features/auth/hooks/useSession';
import type { SocialProvider } from '@/features/auth/api/socialSignIn';

import {
  addPasskey,
  connectProvider,
  disconnectProvider,
  fetchMyLoginMethods,
  removePasskey,
  sendSetPasswordLink,
  type MyLoginMethods,
} from '../api/loginMethods';

import { requireClient } from './useMyNames';

/** What the section says after an action, as a key under loginMethods.notes in account.json. */
export type LoginMethodNote =
  | 'lastWay'
  | 'actionFailed'
  | 'passkeyAdded'
  | 'passkeyCancelled'
  | 'passwordLinkSent'
  | 'tooManyAttempts';

/** The cache key of the signed-in person's ways to log in. */
const methodsKey = (userId: string | null) => ['my-login-methods', userId];

/** One action: what it does, and the note it leaves (null leaves none). */
type Action = () => Promise<LoginMethodNote | null>;

/**
 * Follows the ways to log in.
 *
 * @returns methods, loadFailed, the actions, isBusy and the note to show
 */
export function useLoginMethods() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const [note, setNote] = useState<LoginMethodNote | null>(null);
  const methods = useQuery<MyLoginMethods>({
    queryKey: methodsKey(userId),
    enabled: userId !== null,
    queryFn: async () => fetchMyLoginMethods(await requireClient()),
  });

  // Every action runs the same way: clear the note, act, leave its note, read the list again.
  const run = useMutation({
    mutationFn: async (action: Action) => action(),
    onMutate: () => setNote(null),
    onSuccess: (resultNote) => setNote(resultNote),
    onError: () => setNote('actionFailed'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: methodsKey(userId) }),
  });

  return {
    methods: methods.data ?? null,
    loadFailed: methods.isError,
    isBusy: run.isPending,
    note,
    connect: (provider: SocialProvider) =>
      run.mutate(async () => {
        await connectProvider(await requireClient(), provider);
        return null;
      }),
    disconnect: (provider: SocialProvider) =>
      run.mutate(async () => {
        const outcome = await disconnectProvider(await requireClient(), provider);
        return outcome === 'last_way' ? 'lastWay' : null;
      }),
    addPasskey: () =>
      run.mutate(async () => {
        const outcome = await addPasskey(await requireClient());
        return outcome === 'added' ? 'passkeyAdded' : 'passkeyCancelled';
      }),
    removePasskey: (passkeyId: string) =>
      run.mutate(async () => {
        await removePasskey(await requireClient(), passkeyId);
        return null;
      }),
    setPassword: () =>
      run.mutate(async () => {
        const outcome = await sendSetPasswordLink(await requireClient());
        return outcome === 'sent' ? 'passwordLinkSent' : 'tooManyAttempts';
      }),
  };
}
