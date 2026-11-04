/**
 * EpubDialog: the short form before an EPUB is made (story S1-E13-05, PRIVACY part f; Robert,
 * 1 Nov 2026, 06:31 to 06:40).
 *
 * Top to bottom: the heading, a line saying the details stay on this device, "Name on the book"
 * (filled in with the pen name, or the username when there is none; any name is fine, the legal
 * one too, and it is typed each time because we never keep it: rule 5), "Title" (filled in from
 * the story), the cover (EpubCoverField), "Add an About the writer page" (off unless ticked,
 * IDEAS-2b), then "Cancel" and "Make EPUB". For a sample of chosen chapters (IDEAS-2b) the heading
 * says so; the form is otherwise the same. While the book is made
 * the button is disabled and a status line says so; a failure shows a plain message and the form
 * stays filled in. A native <dialog>, so focus stays inside and Escape closes it.
 * Who shows it: EpubSection. What it calls: EpubCoverField and the make() it is given
 * (useMakeEpub).
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { EpubState, EpubStory } from '../hooks/useMakeEpub';
import type { EpubForm } from '../lib/runEpub';
import { useDataExportTranslation } from '../registerDataExportTranslations';

import { EpubCoverField } from './EpubCoverField';

/** What the dialog needs. */
export interface EpubDialogProps {
  isOpen: boolean;
  story: EpubStory;
  /** The chapters of a sample, by ID; null for the whole book (IDEAS-2b). */
  sampleChapterIds: string[] | null;
  /** The pen name, or the username, to fill the name in with. */
  suggestedName: string;
  state: EpubState;
  onMake: (form: EpubForm) => void;
  onClose: () => void;
}

/** What is wrong with the form, or null when it can be sent. */
type FormProblem = 'noName' | 'noTitle' | 'noFile' | null;

/** The form's values and what is wrong with them. */
function useEpubFormValues(
  story: EpubStory,
  suggestedName: string,
  sampleChapterIds: string[] | null,
) {
  const [name, setName] = useState(suggestedName);
  const [title, setTitle] = useState(story.title);
  const [usesFile, setUsesFile] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<FormProblem>(null);
  // "About the writer" stays off unless the writer ticks it (idea IDEA-20261101-4).
  const [withAboutWriter, setWithAboutWriter] = useState(false);

  /** Checks the values; returns the form to send, or null after showing what to fix. */
  function checked(): EpubForm | null {
    let found: FormProblem = null;
    if (file === null && usesFile) found = 'noFile';
    if (title.trim() === '') found = 'noTitle';
    if (name.trim() === '') found = 'noName';
    setProblem(found);
    if (found !== null) return null;
    const cover =
      usesFile && file !== null ? { kind: 'file' as const, file } : { kind: 'story' as const };
    return {
      name: name.trim(),
      title: title.trim(),
      cover,
      chapterIds: sampleChapterIds,
      withAboutWriter,
    };
  }

  return {
    name,
    setName,
    title,
    setTitle,
    usesFile,
    setUsesFile,
    file,
    setFile,
    withAboutWriter,
    setWithAboutWriter,
    problem,
    checked,
  };
}

/** The status line under the form: making, or failed. */
function MakingStatus({ state }: { state: EpubState }) {
  const { t } = useDataExportTranslation();
  return (
    <div aria-live="polite">
      {state.phase === 'making' && (
        <p role="status" className="m-0 text-[15px] text-body">
          {t('epub.making')}
        </p>
      )}
      {state.phase === 'failed' && <Notice tone="error">{t('epub.failed')}</Notice>}
    </div>
  );
}

/** The name, the title and the cover, each with its message when it needs fixing. */
function EpubFields({
  story,
  values,
}: {
  story: EpubStory;
  values: ReturnType<typeof useEpubFormValues>;
}) {
  const { t } = useDataExportTranslation();
  return (
    <>
      <TextInput
        id="epub-name"
        label={t('epub.nameLabel')}
        hint={t('epub.nameHint')}
        autoComplete="off"
        value={values.name}
        errorMessage={values.problem === 'noName' ? t('epub.problems.noName') : undefined}
        onChange={(event) => values.setName(event.target.value)}
      />
      <TextInput
        id="epub-title"
        label={t('epub.titleLabel')}
        value={values.title}
        errorMessage={values.problem === 'noTitle' ? t('epub.problems.noTitle') : undefined}
        onChange={(event) => values.setTitle(event.target.value)}
      />
      <EpubCoverField
        story={story}
        title={values.title}
        name={values.name}
        usesFile={values.usesFile}
        file={values.file}
        onUsesFileChange={values.setUsesFile}
        onFileChange={values.setFile}
        errorMessage={values.problem === 'noFile' ? t('epub.problems.noFile') : undefined}
      />
      <AboutWriterChoice isChecked={values.withAboutWriter} onChange={values.setWithAboutWriter} />
    </>
  );
}

/** "Add an About the writer page", a real checkbox with its hint (IDEAS-2b). */
function AboutWriterChoice({
  isChecked,
  onChange,
}: {
  isChecked: boolean;
  onChange: (isChecked: boolean) => void;
}) {
  const { t } = useDataExportTranslation();
  return (
    <div className="flex min-h-11 items-start gap-3">
      <input
        id="epub-about-writer"
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0"
        aria-describedby="epub-about-writer-hint"
        checked={isChecked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <div className="flex flex-col gap-0.5">
        <label htmlFor="epub-about-writer" className="text-[15px] font-semibold text-heading">
          {t('epub.aboutLabel')}
        </label>
        <span id="epub-about-writer-hint" className="text-sm text-meta">
          {t('epub.aboutHint')}
        </span>
      </div>
    </div>
  );
}

/**
 * Renders the dialog.
 *
 * @returns the dialog element (closed unless isOpen)
 */
export function EpubDialog({
  isOpen,
  story,
  sampleChapterIds,
  suggestedName,
  state,
  onMake,
  onClose,
}: EpubDialogProps) {
  const { t } = useDataExportTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const values = useEpubFormValues(story, suggestedName, sampleChapterIds);
  const headingKey = sampleChapterIds === null ? 'epub.dialogHeading' : 'epub.sampleDialogHeading';
  const isMaking = state.phase === 'making';

  // Open and close the native dialog with isOpen.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  /** Checks the form, then hands it on to be made. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = values.checked();
    if (form !== null) onMake(form);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="epub-dialog-heading"
      aria-describedby="epub-dialog-intro"
      onClose={onClose}
      className="m-auto max-h-[calc(100dvh-32px)] w-[min(560px,calc(100vw-32px))] overflow-y-auto rounded-card border border-border bg-surface p-7 text-ink shadow-card backdrop:bg-ink/45"
    >
      <form className="flex flex-col gap-4" noValidate onSubmit={submit}>
        <h2
          id="epub-dialog-heading"
          className="m-0 font-heading text-[26px] leading-[1.15] font-bold text-heading"
        >
          {t(headingKey, { title: story.title })}
        </h2>
        <p id="epub-dialog-intro" className="m-0 text-base leading-relaxed text-body">
          {t('epub.dialogIntro')}
        </p>
        <EpubFields story={story} values={values} />
        <MakingStatus state={state} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" size="lg" variant="secondary" onClick={onClose}>
            {t('epub.cancel')}
          </Button>
          <Button type="submit" size="lg" disabled={isMaking}>
            {t('epub.make')}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
