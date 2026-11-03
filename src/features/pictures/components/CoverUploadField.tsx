/**
 * CoverUploadField: "Upload a picture" for a story's cover in Story settings (story S1-E10-05,
 * the board's "Upload a picture" tab on NewStory 4.2).
 *
 * The picture goes into the story's folder of the private covers bucket, is registered and checked
 * at once. The writer sees their own picture straight away (a preview made in the browser, never
 * sent anywhere else); readers see it only once the check passes (CLAUDE.md rule 19). Saving the
 * settings makes it the cover.
 * Shown only while picture_uploads is on, and only for a story that exists already, because the
 * database lets an upload into a story's folder only for its owner (cover_upload_allowed).
 * Who uses it: CoverSection. What it calls: usePictureUpload, PictureUploadField.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { usePictureUpload } from '../hooks/usePictureUpload';

import { PictureUploadField } from './PictureUploadField';

/** What the field needs. */
export interface CoverUploadFieldProps {
  storyId: string;
  /** Called with the stored path once the upload is registered. */
  onUploaded: (path: string) => void;
}

/**
 * A preview address for a file picked in the browser, freed when it changes or the field goes.
 *
 * @param file - the picked file, or null
 * @returns the address, or null
 */
function useLocalPreview(file: File | null): string | null {
  // Made once per file; freed when the file changes or the field goes.
  const address = useMemo(() => (file === null ? null : URL.createObjectURL(file)), [file]);
  useEffect(() => {
    if (address === null) return undefined;
    return () => URL.revokeObjectURL(address);
  }, [address]);
  return address;
}

/**
 * Renders the field and, after an upload, the writer's own preview.
 *
 * @returns the field
 */
export function CoverUploadField({ storyId, onUploaded }: CoverUploadFieldProps) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<File | null>(null);
  const { upload, outcome, isUploading } = usePictureUpload({
    bucket: 'covers',
    folder: storyId,
    kind: 'cover',
  });
  const uploadedPath = outcome?.kind === 'uploaded' ? outcome.path : null;
  const preview = useLocalPreview(uploadedPath === null ? null : picked);
  // Step 1: once registered, the path becomes the form's cover answer (saved with the settings),
  // once per upload, whatever the form does to its callback in between.
  const reportedPath = useRef<string | null>(null);
  useEffect(() => {
    if (uploadedPath === null || reportedPath.current === uploadedPath) return;
    reportedPath.current = uploadedPath;
    onUploaded(uploadedPath);
  }, [uploadedPath, onUploaded]);
  return (
    <div className="flex flex-col gap-4 rounded-[14px] bg-panel p-4 sm:flex-row sm:items-start">
      {preview !== null && (
        <img
          src={preview}
          alt={t('pictures.coverPreview')}
          className="aspect-[5/8] w-[120px] shrink-0 rounded-[16px] border border-border object-cover"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <PictureUploadField
          label={t('pictures.coverLabel')}
          hint={t('pictures.coverHint')}
          isUploading={isUploading}
          outcome={outcome}
          onPick={(file) => {
            setPicked(file);
            upload(file);
          }}
        />
      </div>
    </div>
  );
}
