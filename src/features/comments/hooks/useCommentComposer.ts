/**
 * useCommentComposer: the comment box's state: the text, the spoiler mark, the kind-words nudge
 * and the post (story S1-E6-01; the nudge from bundle ADMIN-2, part d3, Robert, 2 Nov 2026).
 *
 * Sending first asks useKindWordsNudge whether to stop for "Still want to send this?"; if not, or
 * after "Send anyway", it posts exactly what was typed. Moved out of CommentComposer in part d3
 * so the component stays short.
 * Who calls it: CommentComposer. What it calls: usePostComment → post_comment() or
 * post_paragraph_comment(), and useKindWordsNudge.
 */
import { useState, type FormEvent, type RefObject } from 'react';

import { usePersonalDetailsCheck } from '@/features/privacy/hooks/usePersonalDetailsCheck';
import type { ChapterAddress } from '@/features/reading/api/likes';

import { usePostComment } from './useCommentActions';
import { useKindWordsNudge } from './useKindWordsNudge';

/** What the composer is posting on. */
export interface ComposerTarget {
  address: ChapterAddress;
  /** For a reply: the comment answered. */
  replyToId?: string;
  /** For a comment on one paragraph (S1-E6-06): its number, from 1. */
  paragraph?: number;
  /** Called after a successful post. */
  onDone?: () => void;
  /** The text box, so "Edit" can put the focus back in it. */
  textBoxRef: RefObject<HTMLTextAreaElement | null>;
}

/**
 * Follows one comment box.
 *
 * @param target - the chapter, and the comment or paragraph it answers
 * @returns the fields and their setters, send() for the form, the nudge's sendAnyway() and
 *   editAgain() and the post's progress
 */
export function useCommentComposer(target: ComposerTarget) {
  const { address, replyToId, paragraph, onDone, textBoxRef } = target;
  const [text, setTextState] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [justPosted, setJustPosted] = useState(false);
  const posting = usePostComment(address);
  const nudge = useKindWordsNudge();
  const details = usePersonalDetailsCheck();

  /** Posts the text as it is; on success the box empties and the list reads again. */
  async function postNow() {
    try {
      const where = paragraph === undefined ? {} : { paragraph };
      await posting.post({ body: text, isSpoiler, replyTo: replyToId ?? null, ...where });
      setTextState('');
      setIsSpoiler(false);
      setJustPosted(true);
      onDone?.();
    } catch {
      // The failure is shown under the form from posting.failure; nothing else to do here.
      setJustPosted(false);
    }
  }

  return {
    text,
    isSpoiler,
    setIsSpoiler,
    justPosted,
    posting,
    isNudgeShown: nudge.isShown,
    /** MUST-1b: "This looks like personal contact details. Post anyway?" is open. */
    isDetailsNoteShown: details.isShown,
    /** A change to the text closes the nudge and the note: the person is editing. */
    setText: (newText: string) => {
      setTextState(newText);
      nudge.close();
      details.close();
    },
    /**
     * The form's submit: stops for the nudge when the text has a word from the lists, then for
     * the personal details note when it looks like contact details (MUST-1b).
     */
    send: async (event: FormEvent) => {
      event.preventDefault();
      if (nudge.shouldNudge(text) || details.shouldHold(text)) return;
      await postNow();
    },
    /** "Send anyway": the person chose to send this text as it is; the details note may still ask. */
    sendAnyway: async () => {
      nudge.acceptText(text);
      if (details.shouldHold(text)) return;
      await postNow();
    },
    /** "Post anyway" on the personal details note (MUST-1b). */
    postWithDetails: async () => {
      details.acceptText(text);
      await postNow();
    },
    /** "Edit" or "Change it": back to the text box, with nothing sent. */
    editAgain: () => {
      nudge.close();
      details.close();
      textBoxRef.current?.focus();
    },
  };
}

/** What useCommentComposer returns, for the composer's parts. */
export type CommentComposerState = ReturnType<typeof useCommentComposer>;
