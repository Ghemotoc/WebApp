/**
 * EpubCoverField: the cover part of the EPUB form (story S1-E13-05, PRIVACY part f; Robert,
 * 1 Nov 2026, 06:33: "the cover is taken from the story. And the writer can also confirm or
 * correct the cover").
 *
 * Two radio buttons, "The story's cover" and "A picture from this device", then, for the second,
 * a JPEG or PNG file field. Beside them a preview of the cover the book will get: the drawn or
 * automatic cover with the title and name as typed, the story's uploaded cover, or the picked
 * file. A picked file stays in the browser: it goes into the book only and is never uploaded, so
 * it needs no picture check (rule 19 covers what other people see).
 * Who shows it: EpubDialog. What it calls: DrawnCover, StoryCoverArt and resolveCoverChoice.
 */
import { useEffect, useId, useMemo } from 'react';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

import type { EpubStory } from '../hooks/useMakeEpub';
import { useDataExportTranslation } from '../registerDataExportTranslations';

/** What the field needs. */
export interface EpubCoverFieldProps {
  story: EpubStory;
  /** The title and name as typed, for the drawn cover's preview. */
  title: string;
  name: string;
  usesFile: boolean;
  file: File | null;
  onUsesFileChange: (usesFile: boolean) => void;
  onFileChange: (file: File | null) => void;
  /** The plain message when "A picture" is chosen but no file is. */
  errorMessage?: string;
}

/** A preview address for the picked file, freed when it changes or the field goes. */
function useLocalPreview(file: File | null): string | null {
  const address = useMemo(() => (file === null ? null : URL.createObjectURL(file)), [file]);
  useEffect(() => {
    if (address === null) return undefined;
    return () => URL.revokeObjectURL(address);
  }, [address]);
  return address;
}

/** The two choices. */
function CoverRadios({
  usesFile,
  onUsesFileChange,
}: Pick<EpubCoverFieldProps, 'usesFile' | 'onUsesFileChange'>) {
  const { t } = useDataExportTranslation();
  const choices = [
    { id: 'epub-cover-story', value: false, label: t('epub.coverStory') },
    { id: 'epub-cover-file', value: true, label: t('epub.coverFile') },
  ];
  return (
    <div className="flex flex-col gap-1">
      {choices.map((choice) => (
        <div key={choice.id} className="flex min-h-11 items-center gap-2.5">
          <input
            id={choice.id}
            type="radio"
            name="epub-cover"
            className="h-5 w-5"
            checked={usesFile === choice.value}
            onChange={() => onUsesFileChange(choice.value)}
          />
          <label htmlFor={choice.id} className="text-[15px] text-heading">
            {choice.label}
          </label>
        </div>
      ))}
    </div>
  );
}

/** The file field for "A picture from this device". */
function CoverFileInput({
  onFileChange,
  errorMessage,
}: Pick<EpubCoverFieldProps, 'onFileChange' | 'errorMessage'>) {
  const { t } = useDataExportTranslation();
  const hintId = useId();
  const errorId = useId();
  const describedBy = errorMessage === undefined ? hintId : `${hintId} ${errorId}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="epub-cover-picture" className="text-sm font-semibold text-ink">
        {t('epub.coverFileLabel')}
      </label>
      <input
        id="epub-cover-picture"
        type="file"
        accept="image/jpeg,image/png"
        aria-describedby={describedBy}
        aria-invalid={errorMessage === undefined ? undefined : true}
        className="min-h-11 text-sm text-body file:mr-3 file:h-11 file:rounded-full file:border file:border-control-border file:bg-surface file:px-4 file:font-semibold file:text-heading"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />
      <p id={hintId} className="m-0 text-[13px] text-meta">
        {t('epub.coverFileHint')}
      </p>
      {errorMessage !== undefined && (
        <p id={errorId} className="m-0 text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

/** The preview of the cover the book will get. */
function CoverPreview({ story, title, name, usesFile, file }: EpubCoverFieldProps) {
  const { t } = useDataExportTranslation();
  const address = useLocalPreview(usesFile ? file : null);
  const drawn = (
    <DrawnCover title={title} penName={name} choice={resolveCoverChoice(story)} size="preview" />
  );
  return (
    <figure className="m-0 flex w-[140px] shrink-0 flex-col gap-1.5">
      {address !== null && (
        <img
          src={address}
          alt=""
          className="aspect-[5/8] w-full rounded-[16px] border border-border object-cover"
        />
      )}
      {address === null && !usesFile && <StoryCoverArt story={story} drawn={drawn} />}
      {address === null && usesFile && (
        <span className="block aspect-[5/8] w-full rounded-[16px] border border-dashed border-control-border bg-panel" />
      )}
      <figcaption className="text-[13px] text-meta">{t('epub.coverPreview')}</figcaption>
    </figure>
  );
}

/**
 * Renders the cover part of the form.
 *
 * @returns a fieldset with the choices, the file field and the preview
 */
export function EpubCoverField(props: EpubCoverFieldProps) {
  const { t } = useDataExportTranslation();
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className="mb-1 eyebrow">{t('epub.coverLegend')}</legend>
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-1 basis-[220px] flex-col gap-2">
          <CoverRadios usesFile={props.usesFile} onUsesFileChange={props.onUsesFileChange} />
          {props.usesFile && (
            <CoverFileInput onFileChange={props.onFileChange} errorMessage={props.errorMessage} />
          )}
        </div>
        <CoverPreview {...props} />
      </div>
    </fieldset>
  );
}
