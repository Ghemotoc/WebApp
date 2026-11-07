/**
 * pictureRulesIds: the ids a picture file field lists in aria-describedby, so screen readers read
 * the picture rule line and the tooltip's full list of allowed kinds with the field (bundle
 * PICTURES-1). Kept apart from the component so fast refresh keeps working.
 * Who calls it: PictureUploadField and the tests of PictureRulesNote.
 * What it calls: nothing.
 */

/**
 * The two ids under one PictureRulesNote.
 *
 * @param id - the id given to PictureRulesNote
 * @returns "<id> <id>-kinds": the visible line, then the tooltip's list
 */
export function pictureRulesIds(id: string) {
  return `${id} ${id}-kinds`;
}

/**
 * The tooltip's id under one PictureRulesNote.
 *
 * @param id - the id given to PictureRulesNote
 * @returns "<id>-kinds"
 */
export function pictureRulesTooltipId(id: string) {
  return `${id}-kinds`;
}
