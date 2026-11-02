/**
 * Helpers for a space moderator's powers (bundle FORUMS-2, part b; story S1-E8-07).
 *
 * Who calls it: SpacePowerChoices (ticking a box), SpaceRunsCard, SpaceModeratorsCard and
 * SpaceMembersPage (saying which powers someone holds). It only orders and joins; the database
 * decides what each power allows.
 */
import { spacePowers, type SpacePower } from '../api/spaces';

/**
 * Adds or takes away one power, keeping the screens' order.
 *
 * @param current - the powers ticked now
 * @param power - the power clicked
 * @param isTicked - whether it is now ticked
 * @returns the new list
 */
export function togglePower(
  current: SpacePower[],
  power: SpacePower,
  isTicked: boolean,
): SpacePower[] {
  const wanted = isTicked ? [...current, power] : current.filter((held) => held !== power);
  return spacePowers.filter((known) => wanted.includes(known));
}

/**
 * The translation keys of the powers someone holds, in the screens' order, for a line such as
 * "Posts, members".
 *
 * @param powers - the powers held
 * @returns the keys under "moderators.powerWords"
 */
export function powerKeys(powers: SpacePower[]): string[] {
  return spacePowers
    .filter((known) => powers.includes(known))
    .map((power) => `moderators.powerWords.${power}`);
}

/**
 * Whether two lists hold the same powers, whatever their order.
 *
 * @param first - one list
 * @param second - the other
 * @returns true when they match
 */
export function samePowers(first: SpacePower[], second: SpacePower[]): boolean {
  return first.length === second.length && first.every((power) => second.includes(power));
}
