/**
 * The staff hook for a data request's copy (bundle ADMIN-2, part c2; story S1-E11-09): building
 * and sending it in this tab, and opening one file, logged.
 *
 * Who calls it: DataRequestCopyPanel and DataRequestFiles.
 * What it calls: lib/runDataRequestCopy.ts (loaded only when a copy is built, with the Word and
 * ZIP libraries) and api/dataRequestCopy.ts. On the parent's path (part c3) the copy is followed
 * by the one-time link to the parent, through api/dataRequestParent.ts. The Word files' words come from Download my data's
 * hooks, in the person's language, so the person reads their own files in it.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  useExportGuideWords,
  useLibraryLabels,
  usePlanText,
  useWordLabels,
} from '@/features/data-export/hooks/useDataExport';
import { formatRomaniaDate } from '@/lib/romania-time';
import { getSupabaseClient } from '@/lib/supabase';

import { openDataRequestFileAddress } from '../api/dataRequestCopy';
import { postParentLink } from '../api/dataRequestParent';
import { DataRequestError, type DataRequestDetail } from '../api/dataRequests';
import type { DataRequestCopyFormat } from '../lib/runDataRequestCopy';

import { dataRequestFailureOf, dataRequestsKey } from './useStaffDataRequests';

/**
 * Gets the shared client.
 *
 * @returns the client
 * Errors: throws DataRequestError('unreachable') without database settings.
 */
async function requireClient() {
  const client = await getSupabaseClient();
  if (client === null) throw new DataRequestError('unreachable');
  return client;
}

/**
 * Follows building and sending the copy, and opening a file.
 *
 * @param request - the request, with the person's language
 * @returns send(format), whether it runs and why it failed; openFile(file), and why it failed;
 *   resendParentLink(), whether it runs, whether it worked and why it failed
 */
export function useDataRequestCopy(request: DataRequestDetail) {
  const queryClient = useQueryClient();
  const { wordLabels, statusLabels } = useWordLabels(request.language);
  const planText = usePlanText(request.language);
  const libraryLabels = useLibraryLabels(request.language);
  const guideWords = useExportGuideWords(request.language);
  const sending = useMutation({
    mutationFn: async (format: DataRequestCopyFormat) => {
      // The builders load only now, so the staff pages don't carry the Word and ZIP libraries.
      const { makeDataRequestCopy } = await import('../lib/runDataRequestCopy');
      const client = await requireClient();
      const fileCount = await makeDataRequestCopy({
        client,
        wordLabels,
        statusLabels,
        planText,
        libraryLabels,
        guideWords,
        formatDate: (isoDate) => formatRomaniaDate(new Date(isoDate), request.language),
        requestId: request.id,
        reference: request.reference,
        format,
      });
      // On the parent's path the copy goes only to the parent, by a one-time link (part c3).
      if (request.goesToParent) await postParentLink(client, 'send', request.id);
      return fileCount;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [dataRequestsKey] }),
  });
  const resending = useMutation({
    mutationFn: async () => postParentLink(await requireClient(), 'send', request.id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [dataRequestsKey] }),
  });
  const opening = useMutation({
    mutationFn: async (file: { exportId: string; displayName: string }) => {
      const address = await openDataRequestFileAddress(
        await requireClient(),
        request.id,
        file.exportId,
        file.displayName,
      );
      window.location.assign(address);
    },
  });
  return {
    send: sending.mutate,
    isSending: sending.isPending,
    hasSent: sending.isSuccess,
    sendFailure: dataRequestFailureOf(sending.error),
    openFile: opening.mutate,
    openFailure: dataRequestFailureOf(opening.error),
    resendParentLink: () => resending.mutate(),
    isResending: resending.isPending,
    hasResent: resending.isSuccess,
    resendFailure: dataRequestFailureOf(resending.error),
  };
}
