/**
 * The staff hooks for data requests (bundle ADMIN-2, part c1; story S1-E11-09): the list, one
 * request, logging a new one and the actions on it (extend, ask the person to confirm, close).
 *
 * Who calls it: StaffDataRequestsPage, NewDataRequestPage and StaffDataRequestPage.
 * What it calls: api/dataRequests.ts. After every change the request and the list are read again,
 * so the page shows what the database now holds.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabaseClient, type AppSupabaseClient } from '@/lib/supabase';

import {
  actOnDataRequest,
  DataRequestError,
  fetchDataRequest,
  fetchDataRequests,
  openDataRequest,
  type DataRequest,
  type DataRequestAction,
  type DataRequestDetail,
  type DataRequestFailure,
  type NewDataRequest,
} from '../api/dataRequests';

/** The query key every data request query starts with, so one change refreshes them all. */
export const dataRequestsKey = 'staff-data-requests';

/**
 * Gets the shared client.
 *
 * @returns the client
 * Errors: throws DataRequestError('unreachable') without database settings.
 */
async function requireClient(): Promise<AppSupabaseClient> {
  const client = await getSupabaseClient();
  if (client === null) throw new DataRequestError('unreachable');
  return client;
}

/**
 * The reason a call failed, or null.
 *
 * @param error - what the call threw
 * @returns the reason; unreachable for anything that isn't a DataRequestError
 */
export function dataRequestFailureOf(error: unknown): DataRequestFailure | null {
  if (error === null || error === undefined) return null;
  return error instanceof DataRequestError ? error.failure : 'unreachable';
}

/**
 * Follows the list.
 *
 * @param onlyOpen - true leaves closed requests out
 * @returns the requests, whether they are loading and why loading failed
 */
export function useStaffDataRequests(onlyOpen: boolean) {
  const list = useQuery<DataRequest[]>({
    queryKey: [dataRequestsKey, 'list', onlyOpen],
    retry: false,
    queryFn: async () => fetchDataRequests(await requireClient(), onlyOpen),
  });
  return {
    requests: list.data ?? [],
    isLoading: list.isPending,
    loadFailure: dataRequestFailureOf(list.error),
  };
}

/**
 * Follows one request and the actions on it.
 *
 * @param requestId - the request
 * @returns the request, its load failure, act(action), whether an action runs and why it failed
 */
export function useStaffDataRequest(requestId: string) {
  const queryClient = useQueryClient();
  const request = useQuery<DataRequestDetail>({
    queryKey: [dataRequestsKey, 'one', requestId],
    retry: false,
    queryFn: async () => fetchDataRequest(await requireClient(), requestId),
  });
  const action = useMutation({
    mutationFn: async (wanted: DataRequestAction) =>
      actOnDataRequest(await requireClient(), requestId, wanted),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [dataRequestsKey] }),
  });
  return {
    request: request.data ?? null,
    isLoading: request.isPending,
    loadFailure: dataRequestFailureOf(request.error),
    act: action.mutateAsync,
    isActing: action.isPending,
    actionFailure: dataRequestFailureOf(action.error),
    lastAction: action.variables?.kind ?? null,
  };
}

/**
 * Logs a new request.
 *
 * @returns open(wanted), whether it runs and why it failed
 */
export function useOpenDataRequest() {
  const queryClient = useQueryClient();
  const opening = useMutation({
    mutationFn: async (wanted: NewDataRequest) => openDataRequest(await requireClient(), wanted),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [dataRequestsKey] }),
  });
  return {
    open: opening.mutateAsync,
    isOpening: opening.isPending,
    failure: dataRequestFailureOf(opening.error),
  };
}
