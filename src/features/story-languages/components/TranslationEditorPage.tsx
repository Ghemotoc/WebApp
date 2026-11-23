/**
 * TranslationEditorPage: one chapter translated side by side with its original (bundle
 * TRANSLATE-1c; board TrEditor; Robert, 16 Nov 2026).
 *
 * Who shows it: the router, at /write/s/:storySlug/translate/:chapterCode. "Translate" and
 * "Continue" in a language's chapter list lead here.
 * What it shows: the bar (TranslationEditorBar), the chapter's title in this language, the
 * original and the translation as two papers side by side (SideBySidePapers), what the last
 * action led to, the tip from the handoff and a link to the full editor for headings and
 * pictures. Phones translate nothing (CALM-9, board D09): they get PhoneTranslateNotice instead.
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
import { TranslationEditorBar } from './TranslationEditorBar';

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

/** The tip under the editor and the way to the full editor. */
function EditorFootnotes({ draft }: { draft: TranslationDraft }) {
  const { t } = useStoryLanguagesTranslation();
  return (
    <div className="flex flex-col gap-1 text-[13px] text-meta max-md:hidden">
      <p className="m-0">{t('editor.tip')}</p>
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

/** The card: the chapter's title in this language and the two papers. Hidden on phones. */
function EditorCard(props: {
  draft: TranslationDraft;
  editor: ReturnType<typeof useTranslationActions>;
}) {
  const { t } = useStoryLanguagesTranslation();
  const { editor } = props;
  const { source } = props.draft;
  const language = languageOwnName(source.languageCode);
  return (
    <section className="flex flex-col gap-6 rounded-card border border-border bg-surface p-7 shadow-card max-md:hidden">
      <TextInput
        id="translation-chapter-title"
        label={t('editor.chapterTitle', { language })}
        lang={source.languageCode}
        value={editor.state.title}
        maxLength={MAXIMUM_CHAPTER_TITLE_LENGTH}
        autoComplete="off"
        onChange={(event) => editor.setTitle(event.target.value)}
      />
      {editor.originalParagraphs.length === 0 ? (
        <p className="m-0 text-body">{t('editor.noParagraphs')}</p>
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
  const place = t('editor.place', {
    number: chapter.position,
    title: source.original.title === '' ? t('chapters.untitled') : source.original.title,
  });
  return (
    <>
      <title>
        {t('editor.documentTitle', { number: chapter.position, story: chapter.story.title })}
      </title>
      <TranslationEditorBar
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
      <EditorCard draft={draft} editor={editor} />
      {editor.outcome !== null && <OutcomeNotice outcome={editor.outcome} language={language} />}
      {editor.outcome === null && editor.state.isDirty && (
        <p role="status" className="m-0 text-[13px] font-semibold text-meta">
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
    <PageContainer className="tmc-rise flex flex-col gap-5 pt-10 pb-7">
      <LoadProblem {...state} isMissing={state.draft === null} kind="chapter" />
      {/* The key starts the editor again with that chapter's words when another one opens. */}
      {state.draft !== null && <LoadedEditor key={chapterCode} draft={state.draft} />}
    </PageContainer>
  );
}
