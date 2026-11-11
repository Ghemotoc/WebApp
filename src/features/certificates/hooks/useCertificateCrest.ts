/**
 * useCertificateCrest: a class's certificate crest and a signed certificate's crest, as React hooks
 * (bundle G13b).
 *
 * Who calls it: CertificateCrestField (the teacher's upload), CertificateLookPicker (the preview)
 * and CertificateSheet (the student's seal). What it calls: ../api/certificateCrest.ts. A change
 * reads the crest again, so the field and the preview show the new crest's state at once.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import type { StoredPicture } from '@/features/pictures/api/pictures';

import {
  certificateCrestAddress,
  fetchClassCertificateCrest,
  setClassCertificateCrest,
  uploadAndSetClassCertificateCrest,
} from '../api/certificateCrest';

/** Signed addresses last 30 minutes (pictures/api/pictures.ts); they are asked for again after 20. */
const freshForMilliseconds = 20 * 60 * 1000;

/** The cache key of one class's crest. */
const classCrestKey = (slug: string) => ['class-certificate-crest', slug];

/**
 * The class's crest, for its teacher.
 *
 * @param slug - the class's address
 * @returns the query: data is the view, or null when the class has no crest
 */
export function useClassCertificateCrest(slug: string) {
  return useQuery({
    queryKey: classCrestKey(slug),
    retry: false,
    staleTime: freshForMilliseconds,
    queryFn: async () => fetchClassCertificateCrest(await requireClient(), slug),
  });
}

/**
 * Uploads a new crest, or takes it off (the class's teacher).
 *
 * @param target - the class's address and ID
 * @returns upload (file → the check's status) and remove, as mutations
 */
export function useCertificateCrestChange(target: { slug: string; spaceId: string }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: classCrestKey(target.slug) });
  const upload = useMutation({
    mutationFn: async (file: File) =>
      uploadAndSetClassCertificateCrest(await requireClient(), { ...target, file }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async () => setClassCertificateCrest(await requireClient(), target.slug, null),
    onSuccess: refresh,
  });
  return { upload, remove };
}

/**
 * A signed certificate's crest address, for its seal.
 *
 * @param crest - the crest the certificate was signed with, or null
 * @returns the query: data is the signed address, or null
 */
export function useSignedCertificateCrest(crest: StoredPicture | null) {
  return useQuery({
    queryKey: ['certificate-crest', crest?.state ?? null, crest?.path ?? null],
    enabled: crest?.state === 'visible',
    retry: false,
    staleTime: freshForMilliseconds,
    queryFn: async () => certificateCrestAddress(await requireClient(), crest),
  });
}
