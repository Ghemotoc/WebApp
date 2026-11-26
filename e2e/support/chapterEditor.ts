/**
 * Helpers for the chapter editor in end-to-end specs (board D05, user story 5.5).
 *
 * Since D05 the editor's Saving, Publish and Story details panels are gone from the page: the
 * save shows in the editor's bar and at the foot of the paper (the screen-reader sentence is a
 * hidden status line), Publish opens its panel in a sheet from the bar, and pictures, video links
 * and scene breaks come from the "+" Insert menu in the toolbar. These helpers keep every spec
 * pointed at the same controls, so a later redraw changes one file.
 * Who uses it: the editor specs (chapter-editor, publish, poem-mode, chapter-pictures and others).
 */
import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The editor's save sentence (SaveStatus), the role="status" line a screen reader hears.
 *
 * @param page - a page with the chapter editor open
 * @returns the status line; read it with toHaveText, it is hidden unless the writer must act
 */
export function editorSaveStatus(page: Page): Locator {
  return page.getByTestId('save-status');
}

/**
 * Opens the Publish sheet from the editor's bar (the visible bar for the screen's width).
 *
 * @param page - a page with the chapter editor open
 * @param language - the interface language, for the button's and sheet's name
 * @returns the open sheet, so the spec can press Publish now or Schedule inside it
 */
export async function openPublishSheet(page: Page, language: 'en' | 'ro' = 'en'): Promise<Locator> {
  // The bar's button says "Publică"; the sheet's heading says "Publicare" in Romanian.
  const name = language === 'en' ? 'Publish' : 'Publică';
  const sheetName = language === 'en' ? 'Publish' : 'Publicare';
  // Step 1: the bar's Publish button; two bars exist (wide and narrow), only one is shown.
  const bar = page.getByRole('navigation', {
    name: language === 'en' ? 'Chapter editor' : 'Editorul capitolului',
  });
  await bar.getByRole('button', { name, exact: true }).filter({ visible: true }).click();
  // Step 2: the sheet is a dialog named after its heading.
  const sheet = page.getByRole('dialog', { name: sheetName, exact: true });
  await expect(sheet).toBeVisible();
  return sheet;
}

/**
 * The toolbar's "+" button that opens the Insert menu.
 *
 * @param page - a page with the chapter editor open
 * @returns the button
 */
export function insertMenuButton(page: Page): Locator {
  return page.getByRole('button', { name: 'Insert a picture, video link or scene break' });
}

/**
 * Opens the Insert menu and presses one of its items.
 *
 * @param page - a page with the chapter editor open
 * @param item - the item's label as the menu shows it ("Picture", "Video link", "Scene break")
 */
export async function insertFromMenu(page: Page, item: string): Promise<void> {
  await insertMenuButton(page).click();
  const menu = page.getByRole('menu', { name: 'Insert' });
  await expect(menu).toBeVisible();
  await menu.getByRole('menuitem', { name: new RegExp(`^${item}`) }).click();
}
