/**
 * WinnerCard: what the class sees once a competition's results are published (bundle
 * CLASS-POINTS, part 2; story S1-E8-15 criteria 11 and 13).
 *
 * What it shows: "Winner", the competition's name, the Winner's pen name and the winning
 * chapter; the Readers' choice pen names beside it; no other name, score or number. An entrant
 * also reads their own result. Below the 8th grade there is no Winner, so it says the results
 * are out and every entrant is a Contestant. The teacher gets the links to the results and to
 * the certificates.
 * Who shows it: ClassCompetitionCard. What it calls: nothing.
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';

import type { WinnerCardData } from '../api/classCompetitions';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

/** What the card needs. */
export interface WinnerCardProps {
  card: WinnerCardData;
  /** The class's address, for the teacher's links. */
  slug: string;
  isTeacher: boolean;
}

/**
 * The Winner's pen name and their chapter.
 *
 * @returns the lines; nothing when there is no Winner
 */
function WinnerLines({ card }: { card: WinnerCardData }) {
  const { t } = useClassCompetitionsTranslation();
  if (card.winner === null) return <p className="m-0 text-body">{t('winner.noWinner')}</p>;
  const chapter = card.winningChapter;
  return (
    <>
      <p className="m-0 font-heading text-2xl font-bold text-heading">{card.winner}</p>
      {chapter !== null && (
        <p className="m-0 text-sm text-body">
          {t('winner.chapter')}{' '}
          <Link
            to={`/s/${chapter.storySlug}/${chapter.chapterCode}`}
            className="font-semibold text-link underline"
          >
            {t('winner.chapterLink', { chapter: chapter.title, story: chapter.storyTitle })}
          </Link>
        </p>
      )}
    </>
  );
}

/**
 * The viewer's own result, when they entered.
 *
 * @returns the lines, or nothing
 */
function MyResult({ card }: { card: WinnerCardData }) {
  const { t } = useClassCompetitionsTranslation();
  if (card.myResult === null) return null;
  return (
    <div className="flex flex-col gap-1 border-t border-border pt-3">
      <p className="m-0 font-semibold text-ink">
        {t('winner.myResult', { result: t(`results.${card.myResult}`) })}
      </p>
      {card.isMyReadersChoice && (
        <p className="m-0 text-sm text-body">{t('winner.myReadersChoice')}</p>
      )}
    </div>
  );
}

/**
 * Renders the card.
 *
 * @returns the card
 */
export function WinnerCard({ card, slug, isTeacher }: WinnerCardProps) {
  const { t } = useClassCompetitionsTranslation();
  const headingId = `winner-card-${card.id}`;
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-2 rounded-card border border-border bg-surface px-6 py-5 shadow-card"
    >
      <Eyebrow>{card.winner === null ? t('winner.noWinnerEyebrow') : t('winner.eyebrow')}</Eyebrow>
      <h2 id={headingId} className="m-0 text-base font-semibold text-ink">
        {card.name}
      </h2>
      <WinnerLines card={card} />
      {card.readersChoice.length > 0 && (
        <p className="m-0 text-sm text-body">
          <span className="font-semibold text-ink">{t('winner.readersChoice')}</span>{' '}
          {card.readersChoice.join(', ')}
        </p>
      )}
      <MyResult card={card} />
      {isTeacher && (
        <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
          <Link
            to={`/spaces/${slug}/competition/${card.id}/results`}
            className="font-semibold text-link underline"
          >
            {t('winner.seeResults')}
          </Link>
          <Link to={`/spaces/${slug}/certificates`} className="font-semibold text-link underline">
            {t('winner.issueCertificates')}
          </Link>
        </div>
      )}
    </section>
  );
}
