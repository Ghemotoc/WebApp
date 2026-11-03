/**
 * Which ratings the yellow button ("Approve and raise the rating") may offer for one picture
 * (bundle ADMIN-2, part e1b; Robert's brief of 2 Nov 2026, section 3).
 *
 * Who calls it: PictureDecisionButtons. It only decides what the screen offers; the database
 * refuses the same things again (raise_rating_for_picture() and the stories_rating_fits_writer
 * trigger), so a stale screen can't get round it.
 */
import type { AgeBand } from '../api/moderationQueue';
import type { PictureToCheck, StoryRating } from '../api/picturesToCheck';

/** The two answers to "What does the picture show?", from the brief, highest first. */
export const raiseChoices = ['18_plus', '16_plus'] as const satisfies readonly StoryRating[];

/** One of the two answers. */
export type RaiseChoice = (typeof raiseChoices)[number];

/** Age groups too young to own a 16+ or 18+ story (brief section 2, Robert 08:50). */
const underSixteen: readonly AgeBand[] = ['under_13', '13_to_15', 'unknown'];

/**
 * The ratings the yellow button may offer.
 *
 * Rules (brief section 3): never for a picture outside a story (a profile picture, a banner);
 * nothing for a story whose owner is under 16, who may rate only up to 13+; 18+ only for a
 * picture uploaded by an adult (builder's proposal for the lawyer: a writer under 18 can't add
 * nude or sexual pictures, so such a picture is red).
 *
 * @param picture - the waiting picture
 * @returns the choices, highest first; empty when the yellow button shouldn't show
 */
export function raiseOptionsFor(picture: PictureToCheck): RaiseChoice[] {
  if (picture.story === null) return [];
  if (picture.ownerAgeBand === null || underSixteen.includes(picture.ownerAgeBand)) return [];
  const isAdultUploader = picture.uploaderAgeBand === '18_plus';
  return raiseChoices.filter((choice) => choice === '16_plus' || isAdultUploader);
}
