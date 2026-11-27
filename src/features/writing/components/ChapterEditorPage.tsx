/**
 * ChapterEditorPage: the chapter editor (story S1-E3-02a; board D05, user story 5.5).
 *
 * Who shows it: the router, at /write/s/:storySlug/c/:chapterCode; "Create and write chapter
 * one" (NewStoryPage), Manage chapters and the cards on the Write page lead here.
 * What it shows, as board D05 draws it at 1440 px: the editor's own bar under the top bar (Back
 * to chapters, the story with "Chapter 16 · Saved · 240 words", Focus mode, Compare versions after
 * a conflict, Preview and Publish; EditorBar), then three columns: the chapter list on the left
 * (WritingChapterList, with Manage chapters and New chapter), the formatting bar and the paper in
 * the middle (EditorToolbarDock, EditorPaper) and, on the right, the chapter's plan
 * (ChapterPlanPanel, which closes to a "Plan for this chapter" button) over "Story details"
 * (EditorStoryDetails). Focus mode hides everything but the bar, the formatting bar and the paper.
 * Below 1024 px: header A only (Back, the chapter, the save and Publish), no tab bar, the
 * formatting bar floating above the keyboard and the plan as a sheet from the bottom.
 * Publish opens the publish panel (PublishPanel, S1-E3-03; its own design is D06) in a sheet.
 * Deep links: "?preview" opens the preview and "?publish" the publish panel, as Manage chapters'
 * More menu asks (board D03).
 * What it calls: useChapterDraft (the chapter, owner only), useDeviceDraft (the copy kept on this
 * device, S1-E3-02b), useChapterEditor (TipTap; pasted HTML cleaned), useAutosave (half a second
 * after typing stops, on blur, and every 10 seconds after a failure → save_chapter_draft();
 * offline keeps; conflicts), useMyStories (story details), CompareVersionsDialog (after a
 * conflict), useChapterPublishing with PublishPanel and ChapterPreviewDialog (S1-E3-03).
 * Errors: a chapter that isn't the writer's shows "We can't find this chapter on this account"; a
 * failed load shows the plain message; a save the writer must act on shows above the paper
 * (SaveStatus), a failed one says "Not saved yet. Trying again" in the bar and on the paper.
 * Story Atlas's writing view (S1-E17-23 to S1-E17-26) gives the chapter list, the plan, the words
 * against the chapter's target with the long-chapter warning under the paper (ChapterWordsLine).
 */
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { Sheet } from '@/components/ui/Sheet';
import { brand } from '@/config/brand';
import { ChapterPlanPanel } from '@/features/atlas/components/ChapterPlanPanel';
import { ChapterWordsLine } from '@/features/atlas/components/ChapterWordsLine';
import { WritingChapterList } from '@/features/atlas/components/WritingChapterList';
import { useOnlineStatus } from '@/features/offline/hooks/useOnlineStatus';

import type { MyChapter } from '../api/chapters';
import type { MyStory } from '../api/stories';
import { useAutosave } from '../hooks/useAutosave';
import { useChapterDraft } from '../hooks/useChapterDraft';
import { useChapterLayout } from '../hooks/useChapterLayout';
import { useChapterEditor } from '../hooks/useChapterEditor';
import { useChapterPublishing } from '../hooks/useChapterPublishing';
import { useDeviceDraft } from '../hooks/useDeviceDraft';
import { useFootnoteEditing } from '../hooks/useFootnoteEditing';
import { useMyStories } from '../hooks/useMyStories';
import { useRememberedCaret } from '../hooks/useRememberedCaret';
import { markdownToEditorDocument } from '../lib/chapterMarkdown';
import type { DeviceDraft } from '../lib/draftStore';
import { useEditorTranslation } from '../registerEditorTranslations';

import { ChapterPreviewDialog } from './ChapterPreviewDialog';
import { CompareVersionsDialog } from './CompareVersionsDialog';
import { useIsWideEditor } from '../hooks/useIsWideEditor';
import { EditorBar } from './EditorBar';
import { EditorPaper } from './EditorPaper';
import { EditorStoryDetails } from './EditorStoryDetails';
import { EditorToolbarDock } from './EditorToolbarDock';
import { LinkDialog } from './LinkDialog';
import { NewChapterButton } from './NewChapterButton';
import { PublishPanel } from './PublishPanel';
import { publishChapterLine } from '../lib/publishChapterLine';
import { SaveStatus } from './SaveStatus';

/** Counts words the way the database does: runs of letters, digits or apostrophes. */
function countWords(text: string): number {
  return text.split(/[^\p{L}\p{N}']+/u).filter((word) => word !== '').length;
}

/** The two lines under the text: the paste note and the rights line. */
function EditorFootnotes() {
  const { t } = useEditorTranslation();
  return (
    <>
      <p className="m-0 type-meta leading-normal text-ink-muted">{t('pasteNote')}</p>
      <p className="m-0 type-meta leading-normal text-ink-muted">
        {t('rights')}{' '}
        <Link to="/legal/terms" className="font-semibold">
          {t('rightsLink')}
        </Link>
      </p>
    </>
  );
}

/** Where the editor starts: the server's draft, or the newer copy kept on this device. */
interface EditorStart {
  title: string;
  body: string;
  /** The server version that text is based on. */
  version: number;
  /** True when the text came from the device copy and still needs saving. */
  hasUnsavedText: boolean;
}

/**
 * Picks the starting text: a device copy wins, because it holds words the server never got
 * (S1-E3-02b). Its version may be older than the server's; the first save then reports the
 * conflict and the writer chooses.
 *
 * @param chapter - the server's draft
 * @param deviceDraft - the device copy, or null
 * @returns where to start
 */
function editorStartFor(chapter: MyChapter, deviceDraft: DeviceDraft | null): EditorStart {
  if (deviceDraft === null) {
    return {
      title: chapter.draftTitle,
      body: chapter.draftBody,
      version: chapter.draftVersion,
      hasUnsavedText: false,
    };
  }
  return {
    title: deviceDraft.title,
    body: deviceDraft.body,
    version: deviceDraft.baseVersion,
    hasUnsavedText: true,
  };
}

/** The loaded editor's state: the title, the word count, the TipTap editor and the autosave. */
function useLoadedEditor(chapter: MyChapter, start: EditorStart) {
  const { t } = useEditorTranslation();
  const { isOnline } = useOnlineStatus();
  const [title, setTitle] = useState(start.title);
  const [wordCount, setWordCount] = useState(chapter.wordCount);
  // The characters in the text, for the long-chapter warning (S1-E17-23); the start is close enough.
  const [characterCount, setCharacterCount] = useState(start.body.length);
  const autosave = useAutosave({
    chapterCode: chapter.code,
    initialVersion: start.version,
    startsWithChanges: start.hasUnsavedText,
    readDraft: () => ({ title, body: editing.readBody() }),
    isOnline,
  });
  // The Layout (LAYOUTS-1): Prose, Play or Poem; the editor and the saved Markdown follow it.
  const layout = useChapterLayout(chapter);
  const editing = useChapterEditor({
    initialBody: start.body,
    label: t('bodyLabel'),
    isPoem: layout.layout === 'poem',
    onChange: () => {
      autosave.markChanged();
      const text = editing.editor?.getText() ?? '';
      setWordCount(countWords(text));
      setCharacterCount(text.length);
    },
    // Leaving the text saves at once (board 4.3: "when you click away from the text").
    onBlur: () => void autosave.saveNow(),
  });
  // Design books item 17: the caret comes back where the writer left it in this story.
  useRememberedCaret(editing.editor, chapter.story.slug, chapter.code);
  // The chapter's footnotes and the open note (BOOKS-D05b, board D13).
  const footnotes = useFootnoteEditing(editing.editor);
  /** A title change: keep it and mark the draft as changed. */
  function changeTitle(value: string) {
    setTitle(value);
    autosave.markChanged();
  }
  /** "Keep the other version": its title and text replace what is on screen. */
  function loadOther(other: MyChapter) {
    setTitle(other.draftTitle);
    editing.editor?.commands.setContent(markdownToEditorDocument(other.draftBody), {
      emitUpdate: false,
    });
    setWordCount(other.wordCount);
    autosave.acceptOther(other.draftVersion);
  }
  return {
    title,
    changeTitle,
    wordCount,
    characterCount,
    autosave,
    editing,
    loadOther,
    layout,
    footnotes,
  };
}

/** The conflict's two choices and the compare dialog's open state (S1-E3-02b). */
function useConflictChoices(loaded: ReturnType<typeof useLoadedEditor>) {
  const [isComparing, setComparing] = useState(false);
  const serverVersion =
    loaded.autosave.state.kind === 'conflict' ? loaded.autosave.state.serverVersion : null;
  return {
    isComparing,
    openCompare: () => setComparing(true),
    closeCompare: () => setComparing(false),
    keepMine: () => {
      setComparing(false);
      if (serverVersion !== null) void loaded.autosave.keepMine(serverVersion);
    },
    keepOther: (other: MyChapter) => {
      setComparing(false);
      loaded.loadOther(other);
    },
  };
}

/** The link dialog and the compare dialog, which sit outside the page's flow. */
function EditorDialogs(props: {
  chapterCode: string;
  loaded: ReturnType<typeof useLoadedEditor>;
  conflict: ReturnType<typeof useConflictChoices>;
}) {
  const { editing, title } = props.loaded;
  return (
    <>
      {editing.editor !== null && (
        <LinkDialog
          editor={editing.editor}
          isOpen={editing.isLinkDialogOpen}
          onClose={editing.closeLinkDialog}
        />
      )}
      <CompareVersionsDialog
        isOpen={props.conflict.isComparing}
        chapterCode={props.chapterCode}
        thisDevice={{
          title,
          text: editing.editor?.getText({ blockSeparator: '\n\n' }) ?? '',
          savedAt: null,
        }}
        onKeepThisDevice={props.conflict.keepMine}
        onKeepOther={props.conflict.keepOther}
        onClose={props.conflict.closeCompare}
      />
    </>
  );
}

/** The editor's open panels: preview, publish, the plan (beside or as a sheet) and focus mode. */
function usePanels() {
  // Manage chapters' More menu opens the preview or the publish panel straight away (board D03).
  const [searchParams] = useSearchParams();
  const [isPreviewOpen, setPreviewOpen] = useState(searchParams.has('preview'));
  const [isPublishOpen, setPublishOpen] = useState(searchParams.has('publish'));
  // "?publish=later" (the Schedule item) opens the dialog on Later.
  const startsLater = searchParams.get('publish') === 'later';
  const [isPlanOpen, setPlanOpen] = useState(true);
  const [isPlanSheetOpen, setPlanSheetOpen] = useState(false);
  const [isFocusMode, setFocusMode] = useState(false);
  return {
    isPreviewOpen,
    setPreviewOpen,
    isPublishOpen,
    setPublishOpen,
    startsLater,
    isPlanOpen,
    setPlanOpen,
    isPlanSheetOpen,
    setPlanSheetOpen,
    isFocusMode,
    setFocusMode,
  };
}

/** The right column from 1024 px: the chapter's plan (or its button) over Story details. */
function PlanColumn(props: {
  chapter: MyChapter;
  story: MyStory | null;
  wordCount: number;
  panels: ReturnType<typeof usePanels>;
}) {
  const { t } = useEditorTranslation();
  const { chapter, panels } = props;
  // The plan's fields have fixed ids, so it is drawn here only when this column shows (1024 px).
  const isWide = useIsWideEditor();
  return (
    <div className="hidden min-w-0 flex-col gap-4 lg:flex">
      {isWide && panels.isPlanOpen ? (
        <ChapterPlanPanel
          slug={chapter.story.slug}
          chapterCode={chapter.code}
          wordCount={props.wordCount}
          onClose={() => panels.setPlanOpen(false)}
        />
      ) : (
        <button
          type="button"
          aria-expanded={false}
          onClick={() => panels.setPlanOpen(true)}
          className={buttonClassName({ variant: 'secondary' }, 'self-start')}
        >
          <ActionIcon name="list" />
          {t('plan.open')}
        </button>
      )}
      {props.story !== null && <EditorStoryDetails story={props.story} />}
    </div>
  );
}

/** The left column from 1024 px: the story's chapters, Manage chapters and New chapter. */
function ChaptersColumn({ chapter }: { chapter: MyChapter }) {
  const { t } = useEditorTranslation();
  const slug = chapter.story.slug;
  return (
    <div className="hidden min-w-0 lg:block">
      <WritingChapterList
        slug={slug}
        openChapterCode={chapter.code}
        footer={
          <div className="flex flex-col items-start gap-2">
            <Link to={`/write/s/${slug}/chapters`} className={buttonClassName({ variant: 'text' })}>
              {t('manageChapters')}
            </Link>
            {/* S1-E17-24: a new chapter from the list is an ordinary draft chapter. */}
            <NewChapterButton slug={slug} label={t('newChapter')} variant="secondary" />
          </div>
        }
      />
    </div>
  );
}

/** What shows above the paper: a save the writer must act on, and a failed layout change. */
function AboveThePaper(props: {
  loaded: ReturnType<typeof useLoadedEditor>;
  conflict: ReturnType<typeof useConflictChoices>;
}) {
  const { t } = useEditorTranslation();
  const { autosave, layout } = props.loaded;
  return (
    <>
      <SaveStatus state={autosave.state} />
      {/* A refused save tries again every 10 seconds; Retry saves at once (design books item 13). */}
      {autosave.state.kind === 'failed' && (
        <ButtonRow>
          <Button variant="secondary" onClick={() => void autosave.saveNow()}>
            {t('saving.retry')}
          </Button>
        </ButtonRow>
      )}
      {autosave.state.kind === 'conflict' && (
        <ButtonRow>
          <Button onClick={props.conflict.keepMine}>{t('conflict.keepMine')}</Button>
          <Button variant="secondary" onClick={props.conflict.openCompare}>
            {t('conflict.compare')}
          </Button>
        </ButtonRow>
      )}
      {layout.hasFailed && <Notice tone="error">{t('layout.failed')}</Notice>}
    </>
  );
}

/** The middle column: the formatting bar, the paper and the lines under it. */
function PaperColumn(props: {
  chapter: MyChapter;
  loaded: ReturnType<typeof useLoadedEditor>;
  conflict: ReturnType<typeof useConflictChoices>;
  onOpenPlan: () => void;
}) {
  const { chapter, loaded } = props;
  const { editing, autosave } = loaded;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {editing.editor !== null && (
        <EditorToolbarDock
          editor={editing.editor}
          onLink={editing.openLinkDialog}
          onFootnote={loaded.footnotes.insert}
          isFootnoteOpen={loaded.footnotes.openNote !== null}
          chapterId={chapter.id}
          onOpenPlan={props.onOpenPlan}
        />
      )}
      <AboveThePaper loaded={loaded} conflict={props.conflict} />
      <EditorPaper
        chapterId={chapter.id}
        chapterNumber={chapter.position}
        title={loaded.title}
        onTitleChange={loaded.changeTitle}
        onTitleBlur={() => void autosave.saveNow()}
        editor={editing.editor}
        layout={loaded.layout}
        wordCount={loaded.wordCount}
        saveState={autosave.state}
        footnotes={loaded.footnotes}
      />
      {/* Words against the chapter's target, live (Story Atlas, S1-E17-23 and S1-E17-26). */}
      <ChapterWordsLine
        slug={chapter.story.slug}
        chapterCode={chapter.code}
        wordCount={loaded.wordCount}
        characterCount={loaded.characterCount}
      />
      <EditorFootnotes />
    </div>
  );
}

/** The sheets and dialogs that sit outside the columns: preview, publish and the phone plan. */
function EditorSheets(props: {
  chapter: MyChapter;
  loaded: ReturnType<typeof useLoadedEditor>;
  conflict: ReturnType<typeof useConflictChoices>;
  publishing: ReturnType<typeof useChapterPublishing>;
  panels: ReturnType<typeof usePanels>;
  language: string;
}) {
  const { t } = useEditorTranslation();
  const { chapter, loaded, panels, publishing } = props;
  const isWide = useIsWideEditor();
  return (
    <>
      <EditorDialogs chapterCode={chapter.code} loaded={loaded} conflict={props.conflict} />
      <ChapterPreviewDialog
        isOpen={panels.isPreviewOpen}
        title={loaded.title}
        markdown={panels.isPreviewOpen ? loaded.editing.readBody() : ''}
        isPoem={loaded.layout.layout === 'poem'}
        language={props.language}
        onClose={() => panels.setPreviewOpen(false)}
      />
      {/* Board D06: a dialog in the middle of the screen, the chapter named under its heading. */}
      <Sheet
        isOpen={panels.isPublishOpen}
        onClose={() => panels.setPublishOpen(false)}
        title={t('publish.heading')}
        subtitle={publishChapterLine(t, publishing.lastState?.number ?? null, loaded.title)}
        placement="centre"
      >
        <PublishPanel
          {...publishing}
          onAction={publishing.run}
          onPreview={() => panels.setPreviewOpen(true)}
          onSaveDraft={() => {
            // Board D06: "Save draft" saves at once and closes the dialog.
            void loaded.autosave.saveNow();
            panels.setPublishOpen(false);
          }}
          startsLater={panels.startsLater}
        />
      </Sheet>
      {/* Tablets and phones: the plan rises from the bottom (board D05). */}
      <Sheet
        isOpen={panels.isPlanSheetOpen}
        onClose={() => panels.setPlanSheetOpen(false)}
        title={t('plan.open')}
      >
        {/* Only while open, and only under 1024 px: the side panel uses the same field ids. */}
        {panels.isPlanSheetOpen && !isWide && (
          <ChapterPlanPanel
            slug={chapter.story.slug}
            chapterCode={chapter.code}
            wordCount={loaded.wordCount}
            variant="sheet"
          />
        )}
      </Sheet>
    </>
  );
}

/** The three columns from 1024 px; focus mode keeps only the paper, in the middle. */
const columnClasses = {
  all: 'flex flex-col gap-6 lg:grid lg:grid-cols-[220px_minmax(0,1fr)_300px] lg:items-start lg:gap-8',
  focus: 'mx-auto flex w-full max-w-[800px] flex-col gap-6',
};

/** The browser tab's title ("Chapter title · Story · product") and the page's hidden h1. */
function EditorDocumentTitle({ chapter, title }: { chapter: MyChapter; title: string }) {
  const { t } = useEditorTranslation();
  const chapterName = title === '' ? t('chapterNumber', { number: chapter.position }) : title;
  return (
    <>
      <title>
        {t('documentTitle', {
          chapter: chapterName,
          story: chapter.story.title,
          productName: brand.productName,
        })}
      </title>
      <h1 className="sr-only">{t('pageHeading')}</h1>
    </>
  );
}

/**
 * The editor itself, once the chapter is loaded: the bar, the three columns and the sheets.
 */
function LoadedEditor({ chapter, start }: { chapter: MyChapter; start: EditorStart }) {
  const writing = useMyStories();
  const loaded = useLoadedEditor(chapter, start);
  const conflict = useConflictChoices(loaded);
  const publishing = useChapterPublishing(chapter, loaded.autosave);
  const panels = usePanels();
  const story = writing.stories.find((candidate) => candidate.slug === chapter.story.slug) ?? null;
  return (
    <>
      <EditorDocumentTitle chapter={chapter} title={loaded.title} />
      <EditorBar
        storySlug={chapter.story.slug}
        storyTitle={chapter.story.title}
        storyLanguage={story?.languageCode ?? 'ro'}
        chapterNumber={chapter.position}
        wordCount={loaded.wordCount}
        saveState={loaded.autosave.state}
        isFocusMode={panels.isFocusMode}
        onFocusModeChange={panels.setFocusMode}
        canCompare={loaded.autosave.state.kind === 'conflict'}
        onCompare={conflict.openCompare}
        onPreview={() => panels.setPreviewOpen(true)}
        onPublish={() => panels.setPublishOpen(true)}
      />
      <div className={panels.isFocusMode ? columnClasses.focus : columnClasses.all}>
        {!panels.isFocusMode && <ChaptersColumn chapter={chapter} />}
        <PaperColumn
          chapter={chapter}
          loaded={loaded}
          conflict={conflict}
          onOpenPlan={() => panels.setPlanSheetOpen(true)}
        />
        {!panels.isFocusMode && (
          <PlanColumn
            chapter={chapter}
            story={story}
            wordCount={loaded.wordCount}
            panels={panels}
          />
        )}
      </div>
      <EditorSheets
        chapter={chapter}
        loaded={loaded}
        conflict={conflict}
        publishing={publishing}
        panels={panels}
        language={story?.languageCode ?? 'ro'}
      />
    </>
  );
}

/** The screens shown instead of the editor. */
type PageMessageKind = 'signedOut' | 'loadFailed' | 'loading' | 'notFound';

/**
 * Which message to show instead of the editor, if any.
 *
 * @returns the message, or null when the editor can start
 */
function pageMessage(
  draft: ReturnType<typeof useChapterDraft>,
  isDeviceRead: boolean,
  chapter: MyChapter | null,
): PageMessageKind | null {
  if (draft.isKnown && !draft.isSignedIn) return 'signedOut';
  if (draft.loadFailed) return 'loadFailed';
  if (!draft.isKnown || !isDeviceRead) return 'loading';
  if (chapter === null) return 'notFound';
  return null;
}

/** The page while the editor can't show: signed out, a failed load, loading or not found. */
function EditorPageMessage({ kind }: { kind: PageMessageKind }) {
  const { t } = useEditorTranslation();
  if (kind === 'loading') return <PageContainer className="pt-12 pb-6" />;
  if (kind === 'signedOut') {
    return (
      <PageContainer className="tmc-rise pt-12 pb-6">
        <p className="m-0 text-ink-muted">{t('signedOut')}</p>
      </PageContainer>
    );
  }
  if (kind === 'loadFailed') {
    return (
      <PageContainer className="tmc-rise pt-12 pb-6">
        <Notice tone="error">{t('errors.loadFailed')}</Notice>
      </PageContainer>
    );
  }
  return (
    <PageContainer className="tmc-rise flex flex-col gap-3 pt-12 pb-6">
      <Eyebrow>{t('back')}</Eyebrow>
      <p className="m-0 text-ink-muted">{t('notFound')}</p>
      <Link to="/write" className="font-semibold">
        {t('back')}
      </Link>
    </PageContainer>
  );
}

/**
 * Renders the page.
 *
 * @returns the editor screen, or a plain message while loading, signed out or not found
 */
export function ChapterEditorPage() {
  const { storySlug = '', chapterCode = '' } = useParams();
  const draft = useChapterDraft(chapterCode);
  // The device copy (S1-E3-02b) is read before the editor starts, so unsaved words show at once.
  const device = useDeviceDraft(chapterCode);
  const chapter =
    draft.chapter !== null && draft.chapter.story.slug === storySlug ? draft.chapter : null;

  const message = pageMessage(draft, device.isRead, chapter);
  if (message !== null || chapter === null)
    return <EditorPageMessage kind={message ?? 'loading'} />;
  return (
    // Below 1024 px the formatting bar floats at the bottom, so the page keeps room under the paper.
    <PageContainer className="tmc-rise flex flex-col gap-6 pt-3 pb-20 lg:pt-6 lg:pb-12">
      <LoadedEditor
        key={chapter.code}
        chapter={chapter}
        start={editorStartFor(chapter, device.deviceDraft)}
      />
    </PageContainer>
  );
}
