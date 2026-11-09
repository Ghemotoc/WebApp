/**
 * useCertificates: the reads and changes behind "Certificates", one certificate's page and the
 * public check page (bundle CLASSES, part e; story S1-E8-12).
 *
 * Who calls it: MyCertificatesPage, CertificatePage, PrintedNameForm and VerifyCertificatePage.
 * What it calls: api/certificates.ts. After the printed name changes, the list is read again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  CertificateError,
  listMyCertificates,
  setPrintedName,
  verifyCertificate,
} from '../api/certificates';

/** The cache key of the signed-in student's certificates. */
export const myCertificatesKey = ['my-certificates'];

/**
 * The failure a call ended with.
 *
 * @param error - whatever the call threw, or null
 * @returns the failure, or null when there is none
 */
export function certificateFailureOf(error: Error | null): CertificateError | null {
  if (error === null) return null;
  return error instanceof CertificateError ? error : new CertificateError('unreachable');
}

/**
 * The signed-in student's certificates.
 *
 * @returns the query: data is the list
 */
export function useMyCertificates() {
  return useQuery({
    queryKey: myCertificatesKey,
    retry: false,
    queryFn: async () => listMyCertificates(await requireClient()),
  });
}

/**
 * Writes or clears the real name one class certificate prints.
 *
 * @param certificateId - the certificate
 * @returns save(name); the failure, isRunning and isDone
 */
export function useSetPrintedName(certificateId: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (printedName: string) =>
      setPrintedName(await requireClient(), { certificateId, printedName }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myCertificatesKey }),
  });
  return {
    save: mutation.mutateAsync,
    failure: certificateFailureOf(mutation.error),
    isRunning: mutation.isPending,
    isDone: mutation.isSuccess,
  };
}

/**
 * Checks one code, once someone has typed one.
 *
 * @param code - the code, or "" before anything is checked
 * @returns the query: data is the check
 */
export function useCertificateCheck(code: string) {
  return useQuery({
    queryKey: ['certificate-check', code],
    enabled: code !== '',
    retry: false,
    queryFn: async () => verifyCertificate(await requireClient(), code),
  });
}
