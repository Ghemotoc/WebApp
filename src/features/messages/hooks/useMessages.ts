/**
 * The Messages hooks: the chats list, one chat with sending and answering a request, and the
 * caller's own setting (story S1-E9-01). The top bar's unread count is in useUnreadMessageCount.ts,
 * so every page doesn't download these (bundle G8c).
 *
 * Who calls them: MessagesPage and its parts. What they call:
 * api/messages.ts. New messages arrive by asking again: every 5 seconds while a chat is open,
 * every 15 seconds for the list and every minute for the top bar, and whenever the person comes
 * back to the tab (the same choice as the notification bell, READ-3; Realtime can replace it
 * later without changing the tables).
 */
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  answerRequest,
  fetchConversation,
  fetchConversations,
  fetchMyMessageSettings,
  markRead,
  MessagesError,
  sendMessage,
  type MessagesFailure,
  type RequestAnswer,
} from '../api/messages';
import { errorShownByHook } from '@/lib/errorShownByHook';

import { unreadMessagesKey } from './useUnreadMessageCount';

/** How often each part asks again, in milliseconds. */
const refreshEvery = { chat: 5_000, list: 15_000 } as const;

/** The cache keys, so a send can refresh the list, the chat and the count together. */
export const messagesKeys = {
  all: ['messages'] as const,
  list: ['messages', 'list'] as const,
  chat: (handle: string) => ['messages', 'chat', handle.toLowerCase()] as const,
  unread: unreadMessagesKey,
  settings: ['messages', 'settings'] as const,
};

/**
 * Why a mutation failed, and the minutes to wait for the hourly limit.
 *
 * @param error - the mutation's error, or null
 * @returns the failure and the minutes
 */
export function messagesFailureOf(error: Error | null): {
  failure: MessagesFailure | null;
  waitMinutes: number | null;
} {
  if (error === null) return { failure: null, waitMinutes: null };
  if (error instanceof MessagesError) {
    return { failure: error.failure, waitMinutes: error.waitMinutes };
  }
  return { failure: 'unreachable', waitMinutes: null };
}

/**
 * The caller's chats and requests.
 *
 * @returns the query
 */
export function useConversations() {
  return useQuery({
    queryKey: messagesKeys.list,
    retry: false,
    refetchInterval: refreshEvery.list,
    refetchOnWindowFocus: true,
    queryFn: async () => fetchConversations(await requireClient()),
  });
}

/**
 * The caller's own message setting and age group.
 *
 * @returns the query
 */
export function useMyMessageSettings() {
  return useQuery({
    queryKey: messagesKeys.settings,
    retry: false,
    queryFn: async () => fetchMyMessageSettings(await requireClient()),
  });
}

/**
 * Marks a chat read whenever its newest message changes while it is open, then refreshes the
 * list and the top bar's count.
 *
 * @param handle - the other person's username
 * @param newestMessageAt - the newest message's time, or null before the first one
 */
function useMarkReadOnNewMessages(handle: string, newestMessageAt: string | null) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (newestMessageAt === null) return;
    let isCurrent = true;
    // Step 1: tell the database the chat is read up to now.
    void requireClient()
      .then((client) => markRead(client, handle))
      // Step 2: the list's dot and the top bar's number follow.
      .then(async () => {
        if (isCurrent) await queryClient.invalidateQueries({ queryKey: ['messages', 'unread'] });
        if (isCurrent) await queryClient.invalidateQueries({ queryKey: messagesKeys.list });
      })
      // A failed mark only leaves the dot until the next visit; the chat itself still shows.
      .catch(errorShownByHook);
    return () => {
      isCurrent = false;
    };
  }, [handle, newestMessageAt, queryClient]);
}

/**
 * One chat: the messages, sending and answering a request.
 *
 * @param handle - the other person's username from the address
 * @returns the query, send(body), answer('accept' | 'delete' | 'no_thanks') and their states
 */
export function useConversation(handle: string) {
  const queryClient = useQueryClient();
  const chat = useQuery({
    queryKey: messagesKeys.chat(handle),
    retry: false,
    refetchInterval: refreshEvery.chat,
    refetchOnWindowFocus: true,
    queryFn: async () => fetchConversation(await requireClient(), handle),
  });
  const messages = chat.data?.messages ?? [];
  useMarkReadOnNewMessages(handle, messages.at(-1)?.at ?? null);
  /** After a change, read this chat and the list again. */
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: messagesKeys.chat(handle) });
    await queryClient.invalidateQueries({ queryKey: messagesKeys.list });
  };
  const send = useMutation({
    mutationFn: async (body: string) => sendMessage(await requireClient(), handle, body),
    onSuccess: refresh,
  });
  const answer = useMutation({
    mutationFn: async (chosen: RequestAnswer) =>
      answerRequest(await requireClient(), handle, chosen),
    onSuccess: refresh,
  });
  return {
    chat,
    send: (body: string) => send.mutateAsync(body),
    isSending: send.isPending,
    sendState: messagesFailureOf(send.error),
    answer: (chosen: RequestAnswer) => answer.mutateAsync(chosen),
    isAnswering: answer.isPending,
    answerState: messagesFailureOf(answer.error),
  };
}
