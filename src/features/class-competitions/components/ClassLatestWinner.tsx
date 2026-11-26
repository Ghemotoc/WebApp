/**
 * ClassLatestWinner: the Winner card under a class page's threads (bundle BOOKS-8; board
 * G03-Class, user story 8.3: "The Winner card shows the latest winner: the competition, the pen
 * name and the chapter, no scores or points").
 *
 * Who shows it: ClassSpaceContent, for a viewer who may read the class.
 * What it shows: for a pupil, the card of the competition published last that has a Winner; below
 * the 8th grade nobody wins, so there is no card (decision 11). The teacher sees every published
 * competition's card, each with the links to its results and certificates (S1-E8-17).
 * What it calls: useClassCompetitions → class_competitions() (already read by the competition
 * panel, so no second call); WinnerCard.
 */
import type { WinnerCardData } from '../api/classCompetitions';
import { useClassCompetitions } from '../hooks/useClassCompetitions';

import { WinnerCard } from './WinnerCard';

/**
 * The cards to show: every one for the teacher, the latest with a Winner for a pupil.
 *
 * @param published - the published competitions
 * @param isTeacher - whether the viewer is the class's teacher
 * @returns the cards, newest first
 */
function cardsToShow(published: WinnerCardData[], isTeacher: boolean): WinnerCardData[] {
  const newestFirst = [...published].sort((a, b) => b.publishedOn.localeCompare(a.publishedOn));
  if (isTeacher) return newestFirst;
  const latest = newestFirst.find((card) => card.winner !== null);
  return latest === undefined ? [] : [latest];
}

/**
 * Renders the card or cards.
 *
 * @param props.slug - the class's address
 * @returns the Winner card, or nothing
 */
export function ClassLatestWinner({ slug }: { slug: string }) {
  const competitions = useClassCompetitions(slug).data;
  if (competitions === undefined || competitions === null) return null;
  const isTeacher = competitions.role === 'teacher';
  return (
    <>
      {cardsToShow(competitions.published, isTeacher).map((card) => (
        <WinnerCard key={card.id} card={card} slug={slug} isTeacher={isTeacher} />
      ))}
    </>
  );
}
