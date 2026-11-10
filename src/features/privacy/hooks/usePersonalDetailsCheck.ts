/**
 * usePersonalDetailsCheck: whether a text box should ask "Post anyway?" before sending words that
 * look like contact details (bundle MUST-1, part b; IDEA-20261108-6).
 *
 * On for anyone under 18 and for adults who switched it on in Settings › Privacy
 * (my_privacy_settings() answers checks_personal_details). The check itself runs here, in the
 * browser (lib/personalDetails.ts): nothing about it is saved, logged or sent to staff, and "Post
 * anyway" sends exactly what was typed (CLAUDE.md rule 19: no automated text moderation).
 * Who calls it: useCommentComposer, the forum post boxes, the message box and the bio form; each
 * shows PersonalDetailsNote while isShown is true.
 * What it calls: usePrivacySettings and findPersonalDetails.
 */
import { useState } from 'react';

import { findPersonalDetails } from '../lib/personalDetails';

import { usePrivacySettings } from './usePrivacySettings';

/**
 * Follows the setting and the note's state for one text box.
 *
 * @returns isShown; shouldHold(text), which opens the note and says so when the text looks like
 *   contact details (once per text: after "Change it", a changed text is checked again);
 *   acceptText(text) for "Post anyway"; close() for "Change it" and when the text changes
 */
export function usePersonalDetailsCheck() {
  const [isShown, setIsShown] = useState(false);
  const [acceptedText, setAcceptedText] = useState<string | null>(null);
  const settings = usePrivacySettings();
  // While the setting loads, or if it can't be read, never hold anything back.
  const isOn = settings.data?.checksPersonalDetails === true;

  /**
   * Decides whether to stop for the note before sending.
   *
   * @param text - the words as typed
   * @returns true when the note opened and the text should wait for the person's choice
   */
  function shouldHold(text: string): boolean {
    if (!isOn || acceptedText === text) return false;
    if (findPersonalDetails(text).length === 0) return false;
    setIsShown(true);
    return true;
  }

  return {
    isShown,
    shouldHold,
    /** "Post anyway": marks this text as chosen and closes the note; the box then sends it. */
    acceptText: (text: string) => {
      setAcceptedText(text);
      setIsShown(false);
    },
    close: () => setIsShown(false),
  };
}

/** What usePersonalDetailsCheck returns, for the boxes that use it. */
export type PersonalDetailsCheck = ReturnType<typeof usePersonalDetailsCheck>;

/** What usePersonalDetailsGate needs: the words the box will send, and how to send them. */
export interface PersonalDetailsGateInput {
  /** Every field the box sends, joined (a thread's title and its first post, for example). */
  text: string;
  /** Sends the box as it is; called straight away, or after "Post anyway". */
  sendNow: () => Promise<void> | void;
}

/**
 * The same check wrapped around a form's submit, for boxes with no other question of their own
 * (forum posts, messages and the bio). The comment box uses usePersonalDetailsCheck directly,
 * because it also asks the kind-words question.
 *
 * @param input - the words and the send
 * @returns submit(event) for the form; isShown, postAnyway() and close() for PersonalDetailsNote
 */
export function usePersonalDetailsGate({ text, sendNow }: PersonalDetailsGateInput) {
  const check = usePersonalDetailsCheck();
  return {
    isShown: check.isShown,
    /** The form's submit: stops for the note when the words look like contact details. */
    submit: (event?: { preventDefault: () => void }) => {
      event?.preventDefault();
      if (check.shouldHold(text)) return;
      void sendNow();
    },
    /** "Post anyway": sends exactly these words. */
    postAnyway: () => {
      check.acceptText(text);
      void sendNow();
    },
    /** "Change it", or the words changed: the note closes. */
    close: check.close,
    /**
     * Wraps a field's setter so typing closes the note: the person is changing the words.
     *
     * @param apply - the field's own setter
     * @returns the setter to give the field
     */
    whileEditing<Value>(apply: (value: Value) => void) {
      return (value: Value) => {
        check.close();
        apply(value);
      };
    },
  };
}

/** What usePersonalDetailsGate returns, for PersonalDetailsGateNote. */
export type PersonalDetailsGate = ReturnType<typeof usePersonalDetailsGate>;
