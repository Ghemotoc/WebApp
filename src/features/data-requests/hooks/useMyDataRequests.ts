/**
 * useMyDataRequests: the signed-in person's own data requests and their answer to "Was this you?"
 * (bundle ADMIN-2, part c1; story S1-E11-09 criterion 4).
 *
 * Who calls it: MyDataRequestsSection on Settings. What it calls: api/myDataRequests.ts.
 * After an answer the list is read again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';

import {
  answerMyDataRequest,
  fetchMyDataRequests,
  MyDataRequestError,
  type MyDataRequest,
} from '../api/myDataRequests';

/**
 * Gets the shared client.
 *
 * @returns the client
 * Errors: throws MyDataRequestError('unreachable') without database settings.
 */
async function requireClient() {
  const client = await getSupabaseClient();
  if (client === null) throw new MyDataRequestError('unreachable');
  return client;
}

/** What the person answers. */
interface DataRequestAnswer {
  reference: string;
  isMine: boolean;
}

/**
 * Follows the list and the answer.
 *
 * @returns the requests, whether loading failed, answer(), whether it runs and why it failed
 */
export function useMyDataRequests() {
  const queryClient = useQueryClient();
  const list = useQuery<MyDataRequest[]>({
    queryKey: ['my-data-requests'],
    retry: false,
    queryFn: async () => fetchMyDataRequests(await requireClient()),
  });
  const answer = useMutation({
    mutationFn: async (wanted: DataRequestAnswer) =>
      answerMyDataRequest(await requireClient(), wanted.reference, wanted.isMine),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['my-data-requests'] }),
  });
  const answerError = answer.error;
  return {
    requests: list.data ?? [],
    loadFailed: list.isError,
    answer: answer.mutate,
    isAnswering: answer.isPending,
    answerFailure: answerError instanceof MyDataRequestError ? answerError.failure : null,
  };
}
