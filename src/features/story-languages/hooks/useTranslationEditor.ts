/**
 * useTranslationEditor: the side-by-side translation of one chapter (bundle TRANSLATE-1c; board
 * TrEditor).
 *
 * Who calls it: TranslationEditorPage.
 * What it calls: the writing feature's fetchMyChapter() and saveChapterDraft() (a translated
 * chapter is an ordinary chapter of the writer's), api/storyLanguages.ts for the original
 * (chapter_translation_source()) and for publishing, and lib/paragraphs.ts for the rule that a
 * paragraph left empty is saved as the original.
 * There is no autosave here: the board has a "Save draft" button, and the page warns before a
 * tab with unsaved changes closes.
 */
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { fetchMyChapter, saveChapterDraft, type MyChapter } from '@/features/writing/api/chapters';
import { MAXIMUM_CHAPTER_CHARACTERS, MAXIMUM_CHAPTER_TITLE_LENGTH } from '@/schemas/chapter';

import {
  fetchTranslationSource,
  publishTranslation,
  type TranslationSource,
} from '../api/storyLanguages';
import {
  composeTranslation,
  splitParagraphs,
  translatedCount,
  translationFields,
} from '../lib/paragraphs';

/** What the last action led to, as a key under "editor.outcomes" in the storyLanguages texts. */
export type TranslationOutcome =
  | 'saved'
  | 'published'
  | 'conflict'
  | 'originalNotPublished'
  | 'empty'
  | 'notActive'
  | 'tooLong'
  | 'failed';

/** The chapter and its original, as the editor loads them. */
export interface TranslationDraft {
  chapter: MyChapter;
  source: TranslationSource;
}

/** The words on screen and where the chapter stands. */
interface EditorState {
  title: string;
  fields: string[];
  version: number;
  isPublished: boolean;
  isDirty: boolean;
}

/**
 * Reads the translated chapter and its original together.
 *
 * @param chapterCode - the translated chapter's code
 * @returns both, or null when the chapter isn't one of the writer's translations
 */
async function fetchDraft(chapterCode: string): Promise<TranslationDraft | null> {
  const client = await requireClient();
  const [chapter, source] = await Promise.all([
    fetchMyChapter(client, chapterCode),
    fetchTranslationSource(client, chapterCode),
  ]);
  return chapter === null || source === null ? null : { chapter, source };
}

/** The editor's starting state for a loaded draft. */
function startingState(draft: TranslationDraft): EditorState {
  return {
    title: draft.chapter.draftTitle,
    fields: translationFields(splitParagraphs(draft.source.original.body), draft.chapter.draftBody),
    version: draft.chapter.draftVersion,
    isPublished: draft.chapter.status === 'published',
    isDirty: false,
  };
}

/** The outcome a publishing refusal stands for. */
function refusalFor(outcome: string): TranslationOutcome {
  if (outcome === 'original_not_published') return 'originalNotPublished';
  if (outcome === 'empty') return 'empty';
  if (outcome === 'not_active') return 'notActive';
  return 'failed';
}

/** Warns before the tab closes while something is unsaved (the browser shows its own words). */
function useUnsavedWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return undefined;
    /** Asks the browser to confirm leaving. */
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);
}

/**
 * The words on screen: the chapter's title and one field per paragraph.
 *
 * @param draft - the chapter and its original
 * @returns the state, setState (for the saving), setTitle and setField
 */
function useEditorWords(draft: TranslationDraft) {
  const [state, setState] = useState<EditorState>(() => startingState(draft));
  return {
    state,
    setState,
    setTitle: (title: string) =>
      setState((current) => ({
        ...current,
        title: title.slice(0, MAXIMUM_CHAPTER_TITLE_LENGTH),
        isDirty: true,
      })),
    setField: (index: number, text: string) =>
      setState((current) => ({
        ...current,
        fields: current.fields.map((field, position) => (position === index ? text : field)),
        isDirty: true,
      })),
  };
}

/**
 * The saving and publishing of a loaded draft.
 *
 * @param draft - the chapter and its original
 * @returns the state, the setters, save(), publish(), isBusy and the last outcome
 */
export function useTranslationActions(draft: TranslationDraft) {
  const originalParagraphs = splitParagraphs(draft.source.original.body);
  const { state, setState, setTitle, setField } = useEditorWords(draft);
  const [outcome, setOutcome] = useState<TranslationOutcome | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  useUnsavedWarning(state.isDirty);

  /** Saves the draft; returns true when the database took it. */
  async function saveDraft(): Promise<boolean> {
    // Step 1: every paragraph is saved; the original stands in for an empty field.
    const body = composeTranslation(originalParagraphs, state.fields);
    if (body.length > MAXIMUM_CHAPTER_CHARACTERS) {
      setOutcome('tooLong');
      return false;
    }
    // Step 2: the same save the full editor uses, with the version this page started from.
    const result = await saveChapterDraft(await requireClient(), draft.chapter.code, {
      title: state.title.trim(),
      body,
      expectedVersion: state.version,
    });
    if (result.status !== 'saved') {
      setOutcome(result.status === 'conflict' ? 'conflict' : refusalFor(result.status));
      return false;
    }
    setState((current) => ({ ...current, version: result.version, isDirty: false }));
    return true;
  }

  /** Runs one action with the buttons disabled, turning a failure into a plain message. */
  async function run(action: () => Promise<void>) {
    setIsBusy(true);
    setOutcome(null);
    try {
      await action();
    } catch {
      setOutcome('failed');
    } finally {
      setIsBusy(false);
    }
  }

  /** "Save draft". */
  async function save() {
    if (await saveDraft()) setOutcome('saved');
  }

  /** "Publish in <language>": saves first, then puts the chapter (or its changes) live. */
  async function publish() {
    // A translation with no paragraph translated would publish the original under another
    // language, so at least one is asked for.
    if (translatedCount(state.fields) === 0) return setOutcome('empty');
    if (!(await saveDraft())) return;
    const client = await requireClient();
    const result = await publishTranslation(client, draft.chapter.code, state.isPublished);
    if (result !== 'ok') return setOutcome(refusalFor(result));
    setState((current) => ({ ...current, isPublished: true }));
    setOutcome('published');
  }

  return {
    state,
    originalParagraphs,
    setTitle,
    setField,
    save: () => void run(save),
    publish: () => void run(publish),
    isBusy,
    outcome,
  };
}

/**
 * Loads one translated chapter with its original.
 *
 * @param chapterCode - the translated chapter's code
 * @returns draft (null while loading, signed out or not found), isSignedIn, isKnown, loadFailed
 */
export function useTranslationDraft(chapterCode: string) {
  const { userId, isKnown: isSessionKnown } = useSession();
  const draft = useQuery<TranslationDraft | null>({
    queryKey: ['translation-draft', userId, chapterCode],
    enabled: userId !== null && chapterCode !== '',
    queryFn: async () => fetchDraft(chapterCode),
    // The editor keeps its own copy of the words; reading again mid-edit would not change them.
    staleTime: Infinity,
    gcTime: 0,
  });
  return {
    draft: draft.data ?? null,
    isSignedIn: userId !== null,
    isKnown: isSessionKnown && (userId === null || !draft.isPending),
    loadFailed: draft.isError,
  };
}
