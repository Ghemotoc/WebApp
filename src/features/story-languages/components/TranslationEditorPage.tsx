/**
 * TranslationEditorPage: one chapter translated side by side with its original (bundle
 * TRANSLATE-1c; board TrEditor; Robert, 16 Nov 2026).
 *
 * Who shows it: the router, at /write/s/:storySlug/translate/:chapterCode. "Translate" and
 * "Continue" in a language's chapter list lead here.
 * What it shows, as board D09 draws it (CALM-9, user story 5.9): the header
 * (TranslationEditorHeader: breadcrumb, "Chapter 1 · Fifteen", the facts line with the words so
 * far, Save draft and Publish), the chapter's title in this language, the original and the
 * translation as two papers side by side (SideBySidePapers), what the last action led to and a
 * link to the full editor for headings and pictures. Phones translate nothing: they get
 * PhoneTranslateNotice instead.
 * What it calls: hooks/useTranslationEditor.ts (save_chapter_draft(), publish_chapter()).
 * Only the writer translates their own story (Robert, 16 Nov 2026, 12:20 UTC).
 * No doodles: an editor screen, like the chapter editor.
 */
import { Link, useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { TextInput } from '@/components/ui/TextInput';
import { languageOwnName } from '@/lib/language-names';
import { MAXIMUM_CHAPTER_TITLE_LENGTH } from '@/schemas/chapter';

import { countWords } from '../lib/paragraphs';

import {
  useTranslationActions,
  useTranslationDraft,
  type TranslationDraft,
  type TranslationOutcome,
} from '../hooks/useTranslationEditor';
import { useStoryLanguagesTranslation } from '../registerStoryLanguagesTranslations';

import { LoadProblem } from './LoadProblem';
import { PhoneTranslateNotice } from './PhoneTranslateNotice';
import { SideBySidePapers } from './SideBySidePapers';
import { TranslationEditorHeader } from './TranslationEditorHeader';

/** The outcomes that are good news; the rest are shown as problems. */
const goodOutcomes: readonly TranslationOutcome[] = ['saved', 'published'];

/** What the last action led to, announced to screen readers. */
function OutcomeNotice({ outcome, language }: { outcome: TranslationOutcome; language: string }) {
  const { t } = useStoryLanguagesTranslation();
  return (
    <Notice tone={goodOutcomes.includes(outcome) ? 'success' : 'error'}>
      {t(`editor.outcomes.${outcome}`, { language })}
    </Notice>
  );
}

/** The way to the full editor, for what the side-by-side papers don't do. */
function EditorFootnotes({ draft }: { draft: TranslationDraft }) {
  const { t } = useStoryLanguagesTranslation();
  return (
    <div className="type-meta text-ink-muted max-md:hidden">
      <p className="m-0">
        <Link
          to={`/write/s/${draft.chapter.story.slug}/c/${draft.chapter.code}`}
          className="inline-flex min-h-11 items-center font-semibold"
        >
          {t('editor.fullEditor')}
        </Link>{' '}
        {t('editor.fullEditorHint')}
      </p>
    </div>
  );
}

/** The chapter's title in this language and the two papers, on the page. Hidden on phones. */
function EditorCard(props: {
  draft: TranslationDraft;
  editor: ReturnType<typeof useTranslationActions>;
  place: string;
}) {
  const { t } = useStoryLanguagesTranslation();
  const { editor, place } = props;
  const { source } = props.draft;
  const language = languageOwnName(source.languageCode);
  return (
    <section aria-label={place} className="flex flex-col gap-6 max-md:hidden">
      <TextInput
        id="translation-chapter-title"
        label={t('editor.chapterTitle', { language })}
        lang={source.languageCode}
        value={editor.state.title}
        maxLength={MAXIMUM_CHAPTER_TITLE_LENGTH}
        autoComplete="off"
        onChange={(event) => editor.setTitle(event.target.value)}
        className="max-w-[480px]"
      />
      {editor.originalParagraphs.length === 0 ? (
        <p className="m-0 text-ink-muted">{t('editor.noParagraphs')}</p>
      ) : (
        <SideBySidePapers
          original={{
            languageCode: source.original.languageCode,
            languageName: languageOwnName(source.original.languageCode),
            paragraphs: editor.originalParagraphs,
          }}
          translation={{
            languageCode: source.languageCode,
            languageName: language,
            fields: editor.state.fields,
          }}
          onChange={editor.setField}
        />
      )}
    </section>
  );
}

/** The editor of a loaded chapter. */
function LoadedEditor({ draft }: { draft: TranslationDraft }) {
  const { t } = useStoryLanguagesTranslation();
  const editor = useTranslationActions(draft);
  const { source, chapter } = draft;
  const language = languageOwnName(source.languageCode);
  // The words so far for the header's facts line ("41 of 64 words so far").
  const words = {
    translated: countWords(editor.state.fields.join(' ')),
    original: countWords(editor.originalParagraphs.join(' ')),
  };
  const place = t('editor.place', {
    number: chapter.position,
    title: source.original.title === '' ? t('chapters.untitled') : source.original.title,
  });
  return (
    <>
      <title>
        {t('editor.documentTitle', { number: chapter.position, story: chapter.story.title })}
      </title>
      <TranslationEditorHeader
        chapterNumber={chapter.position}
        words={words}
        edition={{
          slug: chapter.story.slug,
          title: chapter.story.title,
          languageCode: source.languageCode,
          languageName: language,
        }}
        place={place}
        isPublished={editor.state.isPublished}
        isBusy={editor.isBusy}
        onSave={editor.save}
        onPublish={editor.publish}
      />
      <PhoneTranslateNotice
        originalSlug={source.original.storySlug}
        chapterNumber={chapter.position}
        languageName={language}
      />
      <EditorCard draft={draft} editor={editor} place={place} />
      {editor.outcome !== null && <OutcomeNotice outcome={editor.outcome} language={language} />}
      {editor.outcome === null && editor.state.isDirty && (
        <p role="status" className="m-0 type-meta font-semibold text-ink-muted">
          {t('editor.unsaved')}
        </p>
      )}
      <EditorFootnotes draft={draft} />
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the editor, a wait, or a plain message
 */
export function TranslationEditorPage() {
  const { chapterCode = '' } = useParams();
  const state = useTranslationDraft(chapterCode);
  return (
    <PageContainer className="tmc-rise flex flex-col gap-6 pt-6 pb-12 lg:pt-12">
      <LoadProblem {...state} isMissing={state.draft === null} kind="chapter" />
      {/* The key starts the editor again with that chapter's words when another one opens. */}
      {state.draft !== null && <LoadedEditor key={chapterCode} draft={state.draft} />}
    </PageContainer>
  );
}
