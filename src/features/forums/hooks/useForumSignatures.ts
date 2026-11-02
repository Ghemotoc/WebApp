/**
 * Forum signatures as React hooks (story S1-E8-08): the person's own signature in Settings, a
 * signature on a profile, a signature picture's signed address, and a moderator's request to
 * change a signature or a banner.
 *
 * Who calls it: SignatureSettingsSection, ProfileSignatureCard, PostSignature,
 * CustomisationChangeForm and SpaceBannerPictureCard. What it calls: api/forumSignatures.ts.
 * After any change every forum read refreshes too, so posts show the new signature at once.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import type { StoredPicture } from '@/features/pictures/api/pictures';

import {
  fetchMySignature,
  fetchProfileSignature,
  fetchSignaturePictureView,
  fetchSpaceBannerChangeRequest,
  requestCustomisationChange,
  saveMySignature,
  SignatureError,
  uploadMySignaturePicture,
  type ChangeRequestAsk,
} from '../api/forumSignatures';

import { forumsQueryKey } from './useForumIndex';

/** The query key every signature read starts with. */
export const signaturesQueryKey = 'forum-signatures';

/** Signed addresses last an hour; the view is asked for again well before that. */
const freshForMilliseconds = 30 * 60 * 1000;

/**
 * The failure a change ended with, as a SignatureError.
 *
 * @param error - whatever the change threw
 * @returns the error, or null when there is none
 */
export function signatureFailureOf(error: unknown): SignatureError | null {
  if (error === null || error === undefined) return null;
  return error instanceof SignatureError ? error : new SignatureError('unreachable');
}

/**
 * The person's own signature and any open request to change it.
 *
 * @returns the query: data is MySignature once loaded
 */
export function useMySignature() {
  return useQuery({
    queryKey: [signaturesQueryKey, 'mine'],
    queryFn: async () => fetchMySignature(await requireClient()),
  });
}

/**
 * A signature on a profile page.
 *
 * @param handle - the profile's username
 * @returns the query: data is the signature, or null when there is none
 */
export function useProfileSignature(handle: string) {
  return useQuery({
    queryKey: [signaturesQueryKey, 'profile', handle],
    queryFn: async () => fetchProfileSignature(await requireClient(), handle),
  });
}

/**
 * A signature picture's signed address.
 *
 * @param picture - the picture, or null when the signature has none
 * @returns the query: data is the view, or null
 */
export function useSignaturePictureView(picture: StoredPicture | null) {
  return useQuery({
    queryKey: [signaturesQueryKey, 'picture', picture?.state ?? null, picture?.path ?? null],
    enabled: picture !== null,
    retry: false,
    staleTime: freshForMilliseconds,
    queryFn: async () => fetchSignaturePictureView(await requireClient(), picture),
  });
}

/**
 * Saving the words, uploading a picture and taking the picture off.
 *
 * @returns save ({text, pictureId}), upload ({text, file} → the check's status) and their states
 */
export function useSignatureChange() {
  const queryClient = useQueryClient();
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: [signaturesQueryKey] });
    await queryClient.invalidateQueries({ queryKey: [forumsQueryKey] });
  };
  const save = useMutation({
    mutationFn: async (change: { text: string; pictureId: string | null }) =>
      saveMySignature(await requireClient(), change),
    onSuccess: refresh,
  });
  const upload = useMutation({
    mutationFn: async (change: { text: string; file: File }) =>
      uploadMySignaturePicture(await requireClient(), change),
    onSuccess: refresh,
  });
  return { save, upload };
}

/**
 * The open request to change a space's banner picture.
 *
 * @param slug - the space's address
 * @param isEnabled - false while the page doesn't show the banner card
 * @returns the query: data is the request, or null
 */
export function useSpaceBannerChangeRequest(slug: string, isEnabled: boolean) {
  return useQuery({
    queryKey: [signaturesQueryKey, 'space-banner', slug],
    enabled: isEnabled,
    queryFn: async () => fetchSpaceBannerChangeRequest(await requireClient(), slug),
  });
}

/**
 * A moderator's request to change a signature or a banner.
 *
 * @returns the mutation: mutate({item, reference, reason})
 */
export function useRequestCustomisationChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ask: ChangeRequestAsk) =>
      requestCustomisationChange(await requireClient(), ask),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [signaturesQueryKey] }),
  });
}
