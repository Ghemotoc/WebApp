/**
 * useQuoteCardPicture: the reader's own background picture for quote cards (bundle GAPS-7, part
 * c; board 3.6 Share: "+ Your own picture … goes through our image check first").
 *
 * One picture per reader, kept between cards. It is uploaded to a private store only they and
 * the picture reviewers can read, checked like every upload (CLAUDE.md rule 19), and usable on a
 * card only once the check passed: `state` says where it stands and `bitmap` is the decoded
 * picture once it may be drawn.
 * Who calls it: useCardBackground. What it calls: the pictures API (upload, read, remove) and
 * usePictureBitmap.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { pictureViewOf, type PictureState } from '@/features/pictures/api/pictures';
import { deleteStoredPicture } from '@/features/pictures/api/pictureUploads';
import {
  fetchMyQuoteCardPicture,
  removeMyQuoteCardPicture,
  uploadQuoteCardPicture,
} from '@/features/pictures/api/quoteCardPicture';
import { uploadOutcomeOf, type UploadOutcome } from '@/features/pictures/hooks/usePictureUpload';

import { usePictureBitmap } from './usePictureBitmap';

/** Signed addresses last 30 minutes (api/pictures.ts); asking again after 20 keeps them fresh. */
const freshForMilliseconds = 20 * 60 * 1000;

/** What the hook gives. */
export interface QuoteCardPicture {
  /** Where the picture stands, or null when the reader has none (or isn't signed in). */
  state: PictureState | null;
  /** The decoded picture, once its check passed and it has loaded. */
  bitmap: ImageBitmap | null;
  upload: (file: File) => void;
  isUploading: boolean;
  /** What the last upload did, for the field's message; null before any. */
  outcome: UploadOutcome | null;
  remove: () => void;
  isRemoving: boolean;
  removeFailed: boolean;
}

/**
 * Uploads a new picture and deletes the file of the one it replaces.
 *
 * @param file - the picture the reader chose
 * @returns the new picture's status after its check
 */
async function replacePicture(file: File): Promise<{ status: string }> {
  const client = await requireClient();
  // Step 1: remember the file being replaced; registering the new one retires its row.
  const previous = await fetchMyQuoteCardPicture(client);
  // Step 2: upload, register and check the new one.
  const result = await uploadQuoteCardPicture(client, file);
  // Step 3: the old file is no longer anyone's picture, so it goes (Storage keeps it if the
  // moderators still need it).
  if (previous !== null && previous.bucket !== null && previous.path !== null) {
    await deleteStoredPicture(client, { bucket: previous.bucket, path: previous.path });
  }
  return result;
}

/**
 * Follows the reader's own background picture.
 *
 * @returns its state, the decoded picture and the ways to change it
 */
export function useQuoteCardPicture(): QuoteCardPicture {
  const { userId, isKnown } = useSession();
  const queryClient = useQueryClient();
  const queryKey = ['quote-card-picture', userId];
  // Step 1: the picture's state and, when it may be read, a short-lived address.
  const picture = useQuery({
    queryKey,
    enabled: isKnown && userId !== null,
    staleTime: freshForMilliseconds,
    refetchInterval: freshForMilliseconds,
    queryFn: async () => {
      const client = await requireClient();
      return pictureViewOf(client, await fetchMyQuoteCardPicture(client));
    },
  });
  const view = picture.data ?? null;
  // Step 2: the picture itself, only once its check passed.
  const { bitmap } = usePictureBitmap(view?.state === 'visible' ? view.url : null);
  // Step 3: changing it; either way the state is read again afterwards.
  const refresh = () => void queryClient.invalidateQueries({ queryKey });
  const uploading = useMutation({ mutationFn: replacePicture, onSettled: refresh });
  const removing = useMutation({
    mutationFn: async () => removeMyQuoteCardPicture(await requireClient()),
    onSettled: refresh,
  });
  return {
    state: view?.state ?? null,
    bitmap,
    upload: uploading.mutate,
    isUploading: uploading.isPending,
    outcome: uploadOutcomeOf(uploading.data?.status, uploading.error),
    remove: removing.mutate,
    isRemoving: removing.isPending,
    removeFailed: removing.isError,
  };
}
