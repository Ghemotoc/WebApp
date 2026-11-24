/**
 * useMissingField: lets a member form keep its main button pressable and, when it is pressed with
 * a required field still empty, say what is missing beside that field and put the focus there
 * (design books item 9, Robert, 23 Nov 2026, 13:25 UTC: "member forms keep the button active and,
 * on press, say exactly what is missing beside the field"). The button is disabled only while
 * the form is sending or saving. Staff forms keep their own behaviour.
 *
 * Why: a greyed-out button gives no reason and is hard to see (Practical UI, Dannaway 2024);
 * pressing it and being told is the safer way to explore (Tidwell, Safe Exploration).
 *
 * Who calls it: the member forms that need something typed or picked before they send, such as
 * CommentComposer, ReplyForm, MessageComposer, AppealSection and NewSupportRequestPage.
 * What it calls: React's useState and the page's document, to find the field by its id.
 */
import { useState } from 'react';

/** What a form gets back for one required field. */
export interface MissingField {
  /** True while the "what is missing" message should show beside the field. */
  isShown: boolean;
  /**
   * Call first thing on submit. When the field is missing it shows the message, moves the focus
   * to the field and returns false, so the form stops there; otherwise it returns true.
   */
  isReadyToSend: () => boolean;
  /**
   * Wraps a form's own submit handler: when the field is missing it stops the browser's submit and
   * says so, otherwise it hands the event to the handler.
   */
  submitWhenReady: <Event extends { preventDefault: () => void }>(
    submit: (event: Event) => void,
  ) => (event: Event) => void;
}

/**
 * Tracks one required field of a member form.
 *
 * @param isMissing - true while the field is still empty (or nothing is picked); the form works
 *   this out from its own state, for example `body.trim() === ''`
 * @param fieldId - the field's id, so the focus can move there. An id, not a ref, because every
 *   field already has one and a ref handed back from a hook can't be read while drawing.
 * @returns whether to show the message, and the check to run on submit
 *
 * Where it fits: the form's submit handler calls isReadyToSend() before sending; while isShown,
 * the field gets an errorMessage (TextInput and Textarea link it with aria-describedby and set
 * aria-invalid).
 */
export function useMissingField(isMissing: boolean, fieldId: string): MissingField {
  // Whether the member has pressed the button while the field was empty.
  const [wasPressedEmpty, setWasPressedEmpty] = useState(false);

  /** Stops the send and says what is missing, or lets it go on. */
  function isReadyToSend(): boolean {
    // Nothing missing: the form sends as usual.
    if (!isMissing) return true;
    // Missing: show the message and take the member to the field.
    setWasPressedEmpty(true);
    document.getElementById(fieldId)?.focus();
    return false;
  }

  /** Builds the form's onSubmit around its own handler. */
  function submitWhenReady<Event extends { preventDefault: () => void }>(
    submit: (event: Event) => void,
  ) {
    return (event: Event) => {
      // Missing: no page reload, and the message shows instead.
      if (!isReadyToSend()) {
        event.preventDefault();
        return;
      }
      submit(event);
    };
  }

  // The message goes away as soon as the field is filled in, without another press.
  return { isShown: wasPressedEmpty && isMissing, isReadyToSend, submitWhenReady };
}
