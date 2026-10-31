/**
 * The rule for a linked project's address (story S1-E17-04: "Given an address that isn't http or
 * https, when I try to save it, then it is refused with a plain message"). The database checks
 * the same rule (story_plans_linked_project_url_web), so the screen can explain before it saves.
 *
 * Who calls it: LinkedProjectSection.
 */

/**
 * Says whether an address may be saved as a linked project.
 *
 * @param address - what the writer typed, trimmed
 * @returns true for an empty address (no link) or a full http or https address with no spaces
 */
export function isLinkableAddress(address: string): boolean {
  if (address === '') return true;
  if (/\s/.test(address) || address.length > 2000) return false;
  try {
    const parsed = new URL(address);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
