/**
 * ClassicTextForm: adding a classic's text (story S1-E11-16 AC 3): staff paste it or open a plain
 * text or Markdown file, see it split into chapters at its headings, fix the chapter titles, then
 * save the chapters.
 *
 * Who shows it: ClassicCard, while no chapter of the work is published.
 * What it calls: lib/splitClassicText.ts for the preview and onSave(chapters). The database checks
 * every chapter again (no HTML, safe links, the length limit; rule 8). Staff never rewrite the
 * text: only the titles can be fixed here (proposal in the story).
 */
import { useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';

import type { ClassicChapterDraft } from '../../api/classics';
import { splitClassicText } from '../../lib/splitClassicText';

/** What the form needs. */
export interface ClassicTextFormProps {
  storyId: string;
  isSaving: boolean;
  onSave: (chapters: ClassicChapterDraft[]) => Promise<unknown>;
}

/**
 * The preview: one title box per chapter, with its first words and word count.
 *
 * @returns the list
 */
function ChapterPreview({
  chapters,
  onTitle,
}: {
  chapters: ClassicChapterDraft[];
  onTitle: (index: number, title: string) => void;
}) {
  const { t } = useTranslation('staff');
  return (
    <ol
      className="m-0 flex list-none flex-col gap-3 p-0"
      aria-label={t('classics.text.previewHeading')}
    >
      {chapters.map((chapter, index) => (
        <li key={index} className="flex flex-col gap-1 border-b border-border pb-3">
          <TextInput
            id={`classic-chapter-title-${index}`}
            label={t('classics.text.chapterTitle', { number: index + 1 })}
            value={chapter.title}
            maxLength={120}
            onChange={(event) => onTitle(index, event.target.value)}
          />
          <p className="m-0 text-sm text-meta">
            {t('classics.text.chapterWords', {
              count: chapter.body.split(/\s+/).filter(Boolean).length,
              start: chapter.body.slice(0, 80),
            })}
          </p>
        </li>
      ))}
    </ol>
  );
}

/**
 * "Or open a file": reads a plain text or Markdown file into the text box.
 *
 * @param props.onText - called with the file's text
 * @returns the file picker and, if the file can't be read, a message
 */
function ClassicFilePicker({ onText }: { onText: (text: string) => void }) {
  const { t } = useTranslation('staff');
  const [fileFailed, setFileFailed] = useState(false);

  /** Reads the chosen file; a file the browser can't read says so instead. */
  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    try {
      onText(await file.text());
      setFileFailed(false);
    } catch {
      setFileFailed(true);
    }
  }

  return (
    <>
      <label className="flex flex-col gap-1 text-sm text-body">
        {t('classics.text.file')}
        <input
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          onChange={(event) => void handleFile(event)}
        />
      </label>
      {fileFailed && <Notice tone="error">{t('classics.text.fileFailed')}</Notice>}
    </>
  );
}

/**
 * Renders the text box, the file picker, the preview and Save.
 *
 * @returns the text form
 */
export function ClassicTextForm({ storyId, isSaving, onSave }: ClassicTextFormProps) {
  const { t } = useTranslation('staff');
  const [text, setText] = useState('');
  const [chapters, setChapters] = useState<ClassicChapterDraft[] | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        id={`classic-text-${storyId}`}
        label={t('classics.text.label')}
        hint={t('classics.text.hint')}
        rows={10}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setChapters(null);
        }}
      />
      <ClassicFilePicker
        onText={(fileText) => {
          setText(fileText);
          setChapters(null);
        }}
      />
      <div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setChapters(splitClassicText(text))}
        >
          {t('classics.text.split')}
        </Button>
      </div>
      {chapters !== null && chapters.length === 0 && (
        <Notice tone="info">{t('classics.text.empty')}</Notice>
      )}
      {chapters !== null && chapters.length > 0 && (
        <>
          <ChapterPreview
            chapters={chapters}
            onTitle={(index, title) =>
              setChapters(
                chapters.map((chapter, at) => (at === index ? { ...chapter, title } : chapter)),
              )
            }
          />
          <div>
            <Button type="button" disabled={isSaving} onClick={() => void onSave(chapters)}>
              {t('classics.text.save', { count: chapters.length })}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
