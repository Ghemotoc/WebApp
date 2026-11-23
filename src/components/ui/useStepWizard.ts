/**
 * useStepWizard: which step of a wizard is open and how far the person has come (CALM-9, the
 * rule for every page: "Long forms are wizards: one step open, done steps fold to a one-line
 * summary with a check, later steps wait below"; boards D02 New story and H08 Waitlist).
 *
 * Who calls it: a page with a long form (NewStoryPage today), which hands the result to
 * StepWizard. What it calls: nothing; it only keeps two numbers.
 */
import { useState } from 'react';

/** What the hook gives back. */
export interface StepWizardState {
  /** The step that is open now, counted from 0. */
  openIndex: number;
  /** The furthest step reached so far: every step up to it is done or open. */
  furthestIndex: number;
  /** Opens a step that was reached before (the Change button); later steps stay closed. */
  openStep: (index: number) => void;
  /** Opens the step after the open one ("Next" and "Skip this step"). */
  goToNextStep: () => void;
}

/**
 * Keeps the wizard's place.
 *
 * @param stepCount - how many steps the wizard has
 * @returns the open step, the furthest step and the two ways to move
 */
export function useStepWizard(stepCount: number): StepWizardState {
  const [openIndex, setOpenIndex] = useState(0);
  const [furthestIndex, setFurthestIndex] = useState(0);

  function openStep(index: number) {
    // Only a step already reached can be opened again; a later one waits for "Next".
    if (index < 0 || index > furthestIndex) return;
    setOpenIndex(index);
  }

  function goToNextStep() {
    // Step 1: the next step, never past the last one.
    const nextIndex = Math.min(openIndex + 1, stepCount - 1);
    setOpenIndex(nextIndex);
    // Step 2: the furthest step moves on with it, so the steps before it count as done.
    setFurthestIndex((current) => Math.max(current, nextIndex));
  }

  return { openIndex, furthestIndex, openStep, goToNextStep };
}
