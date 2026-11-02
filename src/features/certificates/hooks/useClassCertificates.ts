/**
 * useClassCertificates: the teacher's results list for a class and the staff look-up and revoke
 * (bundle CLASSES, part e; story S1-E8-12 criteria 1, 5 and 7).
 *
 * Who calls it: ClassCertificatesPage, ClassResultsForm and StaffCertificatesPage. What it calls:
 * api/classCertificates.ts. After a change, the lists are read again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  findStaffCertificate,
  issueClassCertificates,
  listClassCertificates,
  revokeCertificate,
  type ClassResultEntry,
} from '../api/classCertificates';

import { certificateFailureOf } from './useCertificates';

/** The cache key of one class's certificates. */
const classCertificatesKey = (slug: string) => ['class-certificates', slug];

/** The cache key of one staff look-up. */
const staffCertificateKey = (code: string) => ['staff-certificate', code];

/**
 * Every certificate issued in a class.
 *
 * @param slug - the class's address
 * @returns the query: data is the list
 */
export function useClassCertificates(slug: string) {
  return useQuery({
    queryKey: classCertificatesKey(slug),
    retry: false,
    queryFn: async () => listClassCertificates(await requireClient(), slug),
  });
}

/**
 * The teacher approves and signs a programme's results.
 *
 * @param slug - the class's address
 * @returns issue(request) → how many changed; issued, the failure and isRunning
 */
export function useIssueClassCertificates(slug: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (request: { programmeName: string; results: ClassResultEntry[] }) =>
      issueClassCertificates(await requireClient(), { slug, ...request }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: classCertificatesKey(slug) }),
  });
  return {
    issue: mutation.mutateAsync,
    issued: mutation.data ?? null,
    failure: certificateFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}

/**
 * Staff look a certificate up by its code, once one is typed.
 *
 * @param code - the code, or "" before a search
 * @returns the query: data is the certificate, or null when there is none
 */
export function useStaffCertificate(code: string) {
  return useQuery({
    queryKey: staffCertificateKey(code),
    enabled: code !== '',
    retry: false,
    queryFn: async () => findStaffCertificate(await requireClient(), code),
  });
}

/**
 * Staff revoke a certificate.
 *
 * @param code - the certificate's code
 * @returns revoke(reason); the failure, isRunning and isDone
 */
export function useRevokeCertificate(code: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (reason: string) =>
      revokeCertificate(await requireClient(), { code, reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffCertificateKey(code) }),
  });
  return {
    revoke: mutation.mutateAsync,
    failure: certificateFailureOf(mutation.error),
    isRunning: mutation.isPending,
    isDone: mutation.isSuccess,
  };
}
