/**
 * newStoryWizard: moves through the new story wizard in a test (CALM-9, board D02).
 *
 * Who uses it: every spec that starts a story at /write/new. The form is five steps now, one open
 * at a time, and only the last one has "Create and write chapter one", so a spec fills the
 * fields of a step and then calls this to reach the step that holds the next field.
 */
import { expect, type Page } from '@playwright/test';

/** The five steps' titles in English, in order (writing.json › newStory.steps). */
export const newStorySteps = [
  'The basics',
  'Type, tags and setting',
  'Cover',
  'Who can read it',
  'Labels, rating and AI',
] as const;

/**
 * Presses "Next" until the named step is open. A step only opens after the ones before it, and
 * the basics need a title first.
 *
 * @param page - the page on /write/new, in English
 * @param stepTitle - the step to open
 */
export async function goToNewStoryStep(page: Page, stepTitle: (typeof newStorySteps)[number]) {
  const openStepTitle = page.locator('li[aria-current="step"] h2');
  for (let presses = 0; presses < newStorySteps.length; presses += 1) {
    const openNow = await openStepTitle.textContent();
    if (openNow === stepTitle) return;
    await page.getByRole('button', { name: /^Next: / }).click();
    // Wait for the next step to open before looking again (a missing title keeps it here).
    await expect(openStepTitle).not.toHaveText(openNow ?? '');
  }
  await expect(openStepTitle).toHaveText(stepTitle);
}

/**
 * Opens the last step, where the rating, the AI answer and "Create and write chapter one" are.
 * Works in English and Romanian: it presses "Next" ("Mai departe") until there is none left.
 *
 * @param page - the page on /write/new, with a title filled in
 */
export async function goToLastNewStoryStep(page: Page) {
  const openStepTitle = page.locator('li[aria-current="step"] h2');
  const nextButton = page.getByRole('button', { name: /^(Next|Mai departe): / });
  for (let presses = 0; presses < newStorySteps.length; presses += 1) {
    // The last step has no "Next", so stop once it is gone.
    if ((await nextButton.count()) === 0) return;
    const openNow = await openStepTitle.textContent();
    await nextButton.click();
    // Wait for the next step to open before looking again (a missing title keeps it here).
    await expect(openStepTitle).not.toHaveText(openNow ?? '');
  }
}
