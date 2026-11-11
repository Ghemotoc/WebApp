/**
 * ChapterEditorPage: the chapter editor, screen 4.3 (story S1-E3-02a; design/boards/Editor.dc.html).
 *
 * Who shows it: the router, at /write/s/:storySlug/c/:chapterCode; "Create and write chapter
 * one" (NewStoryPage) and the cards on Your writing lead here.
 * What it shows: the breadcrumb (Writer dashboard › the story › Chapter n, with the state pill),
 * the title field, the toolbar, the text, the paste note and the rights line, with the aside
 * (Saving, Publish, Story details, Your stories) beside them (below on phones).
 * What it calls: useChapterDraft (the chapter, owner only), useDeviceDraft (the copy kept on
 * this device, S1-E3-02b), useChapterEditor (TipTap; pasted HTML cleaned), useAutosave (every
 * 10 seconds and on blur → save_chapter_draft(); offline keeps; conflicts), useMyStories (the
 * aside), CompareVersionsDialog (after a conflict), useChapterPublishing with PublishPanel and
 * ChapterPreviewDialog (S1-E3-03).
 * Errors: a chapter that isn't the writer's shows "We can't find this chapter on this account"; a
 * failed load shows the plain message; save problems show in the Saving box.
 * The toolbar's Insert menu (ChapterInsertControls) adds pictures (S1-E3-09) while the
 * picture_uploads flag is on; drawings, music and video join it with S1-E3-10 and S1-E3-11.
 * Story Atlas's writing view (S1-E17-23 to S1-E17-26) adds, from src/features/atlas: the story's
 * chapter list on the left (WritingChapterList, with "New chapter"), the chapter's plan under the
 * aside (ChapterPlanPanel), the words against the chapter's target under the text with the
 * long-chapter warning (ChapterWordsLine) and Focus mode (FocusModeToggle), which hides the list
 * and the plan.
 */
import { EditorContent } from '@tiptap/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { TextInput } from '@/components/ui/TextInput';
import { brand } from '@/config/brand';
import { ChapterPlanPanel } from '@/features/atlas/components/ChapterPlanPanel';
import { ChapterWordsLine } from '@/features/atlas/components/ChapterWordsLine';
import { FocusModeToggle } from '@/features/atlas/components/FocusModeToggle';
import { WritingChapterList } from '@/features/atlas/components/WritingChapterList';
import { MAXIMUM_CHAPTER_TITLE_LENGTH } from '@/schemas/chapter';

import type { ChapterStatus, MyChapter } from '../api/chapters';
import type { MyStory } from '../api/stories';
import { useOnlineStatus } from '@/features/offline/hooks/useOnlineStatus';

import { useAutosave } from '../hooks/useAutosave';
import { useChapterDraft } from '../hooks/useChapterDraft';
import { useChapterEditor } from '../hooks/useChapterEditor';
import { usePoemMode } from '../hooks/usePoemMode';
import { useChapterPublishing } from '../hooks/useChapterPublishing';
import { useDeviceDraft } from '../hooks/useDeviceDraft';
import { useMyStories } from '../hooks/useMyStories';
import { markdownToEditorDocument } from '../lib/chapterMarkdown';
import { EditingChapterContext } from '../lib/editingChapter';
import type { DeviceDraft } from '../lib/draftStore';

import { ChapterPreviewDialog } from './ChapterPreviewDialog';
import { CompareVersionsDialog } from './CompareVersionsDialog';
import { EditorAside } from './EditorAside';
import { EditorToolbar } from './EditorToolbar';
import { PoemModeSwitch } from './PoemModeSwitch';
import { LinkDialog } from './LinkDialog';
import { NewChapterButton } from './NewChapterButton';
import { PublishPanel } from './PublishPanel';
import { useEditorTranslation } from '../registerEditorTranslations';

/** The state pill's tone: a draft is neutral, scheduled gold, published sage. */
const stateTone = { draft: 'neutral', scheduled: 'gold', published: 'sage' } as const;

/** The breadcrumb: Writer dashboard › the story (its Manage chapters page, S1-E3-04) › Chapter n, then the state pill. */
function EditorBreadcrumb({ chapter, status }: { chapter: MyChapter; status: ChapterStatus }) {
  const { t } = useEditorTranslation();
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
        to={`/write/s/${chapter.story.slug}/chapters`}
        className="inline-flex min-h-11 items-center font-semibold no-underline hover:underline"
      >
        {chapter.story.title}
      </Link>
      <ChevronRightIcon />
      <span aria-current="page" className="text-ink">
        {t('chapterNumber', { number: chapter.position })}
      </span>
      <InfoPill tone={stateTone[status]}>{t(`state.${status}`)}</InfoPill>
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
  const { t } = useEditorTranslation();
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
  const { t } = useEditorTranslation();
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
  // Poem mode (MUST-2): the switch, which the editor and the saved Markdown follow.
  const poem = usePoemMode(chapter);
  const editing = useChapterEditor({
    initialBody: start.body,
    label: t('bodyLabel'),
    isPoem: poem.isPoem,
    onChange: () => {
      autosave.markChanged();
      const text = editing.editor?.getText() ?? '';
      setWordCount(countWords(text));
      setCharacterCount(text.length);
    },
    // Leaving the text saves at once (board 4.3: "when you click away from the text").
    onBlur: () => void autosave.saveNow(),
  });
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
  return { title, changeTitle, wordCount, characterCount, autosave, editing, loadOther, poem };
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

/** The aside column: Saving (with the conflict choices), Publish, Story details, Your stories. */
function EditorSideColumn(props: {
  chapter: MyChapter;
  loaded: ReturnType<typeof useLoadedEditor>;
  conflict: ReturnType<typeof useConflictChoices>;
  publishing: ReturnType<typeof useChapterPublishing>;
  stories: MyStory[];
  onPreview: () => void;
  /** False in focus mode, which hides the planning panel (S1-E17-23). */
  showsPlan: boolean;
}) {
  const { chapter, publishing } = props;
  const story = props.stories.find((candidate) => candidate.slug === chapter.story.slug) ?? null;
  return (
    <div className="flex w-full flex-[1_1_300px] flex-col gap-7 lg:max-w-[340px]">
      <EditorAside
        saveState={props.loaded.autosave.state}
        publishControls={
          <PublishPanel {...publishing} onAction={publishing.run} onPreview={props.onPreview} />
        }
        onKeepMine={props.conflict.keepMine}
        onCompare={props.conflict.openCompare}
        story={story}
        stories={props.stories.filter((candidate) => candidate.deletedAt === null)}
        currentSlug={chapter.story.slug}
      />
      {/* The chapter's planning (Story Atlas, S1-E17-24), stacked under the aside on a phone. */}
      {props.showsPlan && <ChapterPlanPanel slug={chapter.story.slug} chapterCode={chapter.code} />}
    </div>
  );
}

/** The main column: the title, the toolbar, the text, the live count, the notes and the dialogs. */
function EditorMainColumn(props: {
  chapter: MyChapter;
  loaded: ReturnType<typeof useLoadedEditor>;
  conflict: ReturnType<typeof useConflictChoices>;
  language: string;
  isPreviewOpen: boolean;
  closePreview: () => void;
}) {
  const { chapter, loaded } = props;
  const { title, changeTitle, wordCount, autosave, editing } = loaded;
  return (
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
          chapterId={chapter.id}
        />
      )}
      <PoemModeSwitch {...loaded.poem} />
      <div
        className={`tmc-chapter-text ${loaded.poem.isPoem ? 'tmc-poem' : ''} rounded-card border border-border bg-surface p-[clamp(24px,4vw,56px)] shadow-card`}
      >
        {/* The blocks inside the text (pictures, cards) read the chapter from here (GAPS-8). */}
        <EditingChapterContext value={chapter.id}>
          <EditorContent editor={editing.editor} />
        </EditingChapterContext>
      </div>
      {/* Words against the chapter's target, live (Story Atlas, S1-E17-23 and S1-E17-26). */}
      <ChapterWordsLine
        slug={chapter.story.slug}
        chapterCode={chapter.code}
        wordCount={wordCount}
        characterCount={loaded.characterCount}
      />
      <EditorFootnotes />
      <EditorDialogs chapterCode={chapter.code} loaded={loaded} conflict={props.conflict} />
      <ChapterPreviewDialog
        isOpen={props.isPreviewOpen}
        title={title}
        markdown={props.isPreviewOpen ? editing.readBody() : ''}
        isPoem={loaded.poem.isPoem}
        language={props.language}
        onClose={props.closePreview}
      />
    </main>
  );
}

/**
 * The editor itself, once the chapter is loaded: the chapter list (Story Atlas's writing view,
 * S1-E17-23; first on a laptop, last on a phone), the main column and the aside with the
 * chapter's plan. Focus mode hides the list and the plan.
 */
function LoadedEditor({ chapter, start }: { chapter: MyChapter; start: EditorStart }) {
  const { t } = useEditorTranslation();
  const writing = useMyStories();
  const loaded = useLoadedEditor(chapter, start);
  const conflict = useConflictChoices(loaded);
  const publishing = useChapterPublishing(chapter, loaded.autosave);
  const [isPreviewOpen, setPreviewOpen] = useState(false);
  const [isFocusMode, setFocusMode] = useState(false);
  const story = writing.stories.find((candidate) => candidate.slug === chapter.story.slug) ?? null;
  const documentTitle =
    loaded.title === '' ? t('chapterNumber', { number: chapter.position }) : loaded.title;

  return (
    <>
      {/* The toggle follows the breadcrumb, clear of the Saving panel's desk lamp on the right. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <EditorBreadcrumb chapter={chapter} status={publishing.state.status} />
        <FocusModeToggle isOn={isFocusMode} onChange={setFocusMode} />
      </div>
      <div className="flex flex-col gap-7 lg:flex-row lg:flex-wrap lg:items-start">
        <title>
          {t('documentTitle', {
            chapter: documentTitle,
            story: chapter.story.title,
            productName: brand.productName,
          })}
        </title>
        <EditorMainColumn
          chapter={chapter}
          loaded={loaded}
          conflict={conflict}
          language={story?.languageCode ?? 'ro'}
          isPreviewOpen={isPreviewOpen}
          closePreview={() => setPreviewOpen(false)}
        />
        <EditorSideColumn
          chapter={chapter}
          loaded={loaded}
          conflict={conflict}
          publishing={publishing}
          stories={writing.stories}
          onPreview={() => setPreviewOpen(true)}
          showsPlan={!isFocusMode}
        />
        {!isFocusMode && (
          <div className="order-last w-full lg:basis-full xl:order-first xl:w-[240px] xl:shrink-0 xl:basis-auto">
            <WritingChapterList
              slug={chapter.story.slug}
              openChapterCode={chapter.code}
              footer={<NewChapterButton slug={chapter.story.slug} label={t('newChapter')} />}
            />
          </div>
        )}
      </div>
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
  if (kind === 'loading') return <PageContainer className="pt-12 pb-7" />;
  if (kind === 'signedOut') {
    return (
      <PageContainer className="tmc-rise pt-12 pb-7">
        <p className="m-0 text-body">{t('signedOut')}</p>
      </PageContainer>
    );
  }
  if (kind === 'loadFailed') {
    return (
      <PageContainer className="tmc-rise pt-12 pb-7">
        <Notice tone="error">{t('errors.loadFailed')}</Notice>
      </PageContainer>
    );
  }
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
    <PageContainer className="tmc-rise flex flex-col gap-3 pt-8 pb-7">
      <LoadedEditor
        key={chapter.code}
        chapter={chapter}
        start={editorStartFor(chapter, device.deviceDraft)}
      />
    </PageContainer>
  );
}
