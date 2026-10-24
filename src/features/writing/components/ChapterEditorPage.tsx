/**
 * ChapterEditorPage: the chapter editor, screen 4.3 (story S1-E3-02a; design/boards/Editor.dc.html).
 *
 * Who shows it: the router, at /write/s/:storySlug/c/:chapterCode; "Create and write chapter
 * one" (NewStoryPage) and the cards on Your writing lead here.
 * What it shows: the breadcrumb (Writer dashboard › the story › Chapter n, with the state pill),
 * the title field, the toolbar, the text, the paste note and the rights line, with the aside
 * (Saving, Publish, Story details, Your stories) beside them (below on phones).
 * What it calls: useChapterDraft (the chapter, owner only), useChapterEditor (TipTap),
 * useAutosave (every 10 seconds and on blur → save_chapter_draft()), useMyStories (the aside).
 * Errors: a chapter that isn't the writer's shows "We can't find this chapter among yours"; a
 * failed load shows the plain message; save problems show in the Saving box.
 * Left out on purpose: the board's Insert menu (pictures, drawings, music, video), which is
 * S1-E3-09 to 11 after March; offline keeping, paste cleaning and the conflict choices, which
 * are S1-E3-02b.
 */
import { EditorContent } from '@tiptap/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { TextInput } from '@/components/ui/TextInput';
import { brand } from '@/config/brand';
import { MAXIMUM_CHAPTER_TITLE_LENGTH } from '@/schemas/chapter';

import type { MyChapter } from '../api/chapters';
import { useAutosave } from '../hooks/useAutosave';
import { useChapterDraft } from '../hooks/useChapterDraft';
import { useChapterEditor } from '../hooks/useChapterEditor';
import { useMyStories } from '../hooks/useMyStories';

import { EditorAside } from './EditorAside';
import { EditorToolbar } from './EditorToolbar';
import { LinkDialog } from './LinkDialog';

/** The state pill's tone: a draft is neutral, scheduled gold, published sage. */
const stateTone = { draft: 'neutral', scheduled: 'gold', published: 'sage' } as const;

/** The breadcrumb: Writer dashboard › the story › Chapter n, then the state pill. */
function EditorBreadcrumb({ chapter }: { chapter: MyChapter }) {
  const { t } = useTranslation('editor');
  return (
    <nav aria-label={t('back')} className="flex flex-wrap items-center gap-2 text-sm text-body">
      <Link
        to="/write"
        className="inline-flex min-h-11 items-center font-semibold no-underline hover:underline"
      >
        {t('back')}
      </Link>
      <ChevronRightIcon />
      <Link
        to={`/write/s/${chapter.story.slug}/settings`}
        className="inline-flex min-h-11 items-center font-semibold no-underline hover:underline"
      >
        {chapter.story.title}
      </Link>
      <ChevronRightIcon />
      <span aria-current="page" className="text-ink">
        {t('chapterNumber', { number: chapter.position })}
      </span>
      <InfoPill tone={stateTone[chapter.status]}>{t(`state.${chapter.status}`)}</InfoPill>
    </nav>
  );
}

/** Counts words the way the database does: runs of letters, digits or apostrophes. */
function countWords(text: string): number {
  return text.split(/[^\p{L}\p{N}']+/u).filter((word) => word !== '').length;
}

/** The title field, styled as the board's big underlined title. */
function ChapterTitleField(props: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const { t } = useTranslation('editor');
  return (
    <TextInput
      id="chapter-title"
      label={t('titleLabel')}
      value={props.value}
      maxLength={MAXIMUM_CHAPTER_TITLE_LENGTH}
      autoComplete="off"
      onChange={(event) => props.onChange(event.target.value)}
      onBlur={props.onBlur}
      className="h-[72px] rounded-none border-0 border-b-2 border-border bg-transparent px-0.5 font-heading text-[clamp(32px,3.6vw,48px)] font-extrabold tracking-[-0.02em] text-heading"
    />
  );
}

/** The two lines under the text: the paste note and the rights line. */
function EditorFootnotes() {
  const { t } = useTranslation('editor');
  return (
    <>
      <p className="m-0 text-[13px] leading-normal text-meta">{t('pasteNote')}</p>
      <p className="m-0 text-[13px] leading-normal text-meta">
        {t('rights')}{' '}
        <Link to="/legal/terms" className="font-semibold">
          {t('rightsLink')}
        </Link>
      </p>
    </>
  );
}

/** The loaded editor's state: the title, the word count, the TipTap editor and the autosave. */
function useLoadedEditor(chapter: MyChapter) {
  const { t } = useTranslation('editor');
  const [title, setTitle] = useState(chapter.draftTitle);
  const [wordCount, setWordCount] = useState(chapter.wordCount);
  const autosave = useAutosave({
    chapterCode: chapter.code,
    initialVersion: chapter.draftVersion,
    readDraft: () => ({ title, body: editing.readBody() }),
  });
  const editing = useChapterEditor({
    initialBody: chapter.draftBody,
    label: t('bodyLabel'),
    onChange: () => {
      autosave.markChanged();
      setWordCount(countWords(editing.editor?.getText() ?? ''));
    },
    // Leaving the text saves at once (board 4.3: "when you click away from the text").
    onBlur: () => void autosave.saveNow(),
  });
  /** A title change: keep it and mark the draft as changed. */
  function changeTitle(value: string) {
    setTitle(value);
    autosave.markChanged();
  }
  return { title, changeTitle, wordCount, autosave, editing };
}

/** The editor itself, once the chapter is loaded: the title, the toolbar, the text and the aside. */
function LoadedEditor({ chapter }: { chapter: MyChapter }) {
  const { t } = useTranslation('editor');
  const writing = useMyStories();
  const { title, changeTitle, wordCount, autosave, editing } = useLoadedEditor(chapter);
  const story = writing.stories.find((candidate) => candidate.slug === chapter.story.slug) ?? null;
  const documentTitle = title === '' ? t('chapterNumber', { number: chapter.position }) : title;

  return (
    <div className="flex flex-col gap-7 lg:flex-row lg:items-start">
      <title>
        {t('documentTitle', {
          chapter: documentTitle,
          story: chapter.story.title,
          productName: brand.productName,
        })}
      </title>
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-3.5">
        <ChapterTitleField
          value={title}
          onChange={changeTitle}
          onBlur={() => void autosave.saveNow()}
        />
        {editing.editor !== null && (
          <EditorToolbar
            editor={editing.editor}
            wordCount={wordCount}
            onLink={editing.openLinkDialog}
          />
        )}
        <div className="tmc-chapter-text rounded-card border border-border bg-surface p-[clamp(24px,4vw,56px)] shadow-card">
          <EditorContent editor={editing.editor} />
        </div>
        <EditorFootnotes />
        {editing.editor !== null && (
          <LinkDialog
            editor={editing.editor}
            isOpen={editing.isLinkDialogOpen}
            onClose={editing.closeLinkDialog}
          />
        )}
      </main>
      <div className="w-full flex-[1_1_300px] lg:max-w-[340px]">
        <EditorAside
          saveState={autosave.state}
          story={story}
          stories={writing.stories.filter((candidate) => candidate.deletedAt === null)}
          currentSlug={chapter.story.slug}
        />
      </div>
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the editor screen, or a plain message while loading, signed out or not found
 */
export function ChapterEditorPage() {
  const { t } = useTranslation('editor');
  const { storySlug = '', chapterCode = '' } = useParams();
  const draft = useChapterDraft(chapterCode);
  const chapter =
    draft.chapter !== null && draft.chapter.story.slug === storySlug ? draft.chapter : null;

  if (draft.isKnown && !draft.isSignedIn) {
    return (
      <PageContainer className="tmc-rise pt-12 pb-7">
        <p className="m-0 text-body">{t('signedOut')}</p>
      </PageContainer>
    );
  }
  if (draft.loadFailed) {
    return (
      <PageContainer className="tmc-rise pt-12 pb-7">
        <Notice tone="error">{t('errors.loadFailed')}</Notice>
      </PageContainer>
    );
  }
  if (!draft.isKnown) return <PageContainer className="pt-12 pb-7" />;
  if (chapter === null) {
    return (
      <PageContainer className="tmc-rise flex flex-col gap-3 pt-12 pb-7">
        <Eyebrow>{t('back')}</Eyebrow>
        <p className="m-0 text-body">{t('notFound')}</p>
        <Link to="/write" className="font-semibold">
          {t('back')}
        </Link>
      </PageContainer>
    );
  }
  return (
    <PageContainer className="tmc-rise flex flex-col gap-3 pt-8 pb-7">
      <EditorBreadcrumb chapter={chapter} />
      <LoadedEditor key={chapter.code} chapter={chapter} />
    </PageContainer>
  );
}
