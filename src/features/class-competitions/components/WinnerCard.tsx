/**
 * WinnerCard: what the class sees once a competition's results are published (bundle
 * CLASS-POINTS, part 2; story S1-E8-15 criteria 11 and 13).
 *
 * What it shows (board G03, BOOKS-8): "Winner · Autumn short story contest", the winning story's
 * title, "by" the Winner's pen name and "Read the chapter"; the Readers' choice pen names under
 * it; no other name, score or number. An entrant
 * also reads their own result. Below the 8th grade there is no Winner, so it says the results
 * are out and every entrant is a Contestant. The teacher gets the links to the results and to
 * the certificates, which open with this competition's results filled in (S1-E8-17).
 * Who shows it: ClassLatestWinner. What it calls: nothing.
 */
import { Link } from 'react-router';

import { MetaLine } from '@/components/ui/MetaLine';

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
 * The winning story, the Winner's pen name and the way to the chapter.
 *
 * @returns the lines, or the "every entrant is a Contestant" line when there is no Winner
 */
function WinnerLines({ card }: { card: WinnerCardData }) {
  const { t } = useClassCompetitionsTranslation();
  if (card.winner === null)
    return <p className="m-0 type-body text-ink-muted">{t('winner.noWinner')}</p>;
  const chapter = card.winningChapter;
  if (chapter === null) {
    return <p className="m-0 type-subheading text-ink-heading">{card.winner}</p>;
  }
  const address = `/s/${chapter.storySlug}/${chapter.chapterCode}`;
  return (
    <>
      <p className="m-0 type-subheading text-ink-heading">
        <Link to={address} className="text-ink-heading no-underline hover:underline">
          {chapter.storyTitle}
        </Link>
      </p>
      <p className="m-0 type-meta text-ink-muted">{t('winner.by', { name: card.winner })}</p>
      <Link
        to={address}
        className="flex min-h-11 w-fit items-center type-body font-semibold text-ink-heading underline"
      >
        {t('winner.readChapter')}
      </Link>
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
        <p className="m-0 type-body text-ink-muted">{t('winner.myReadersChoice')}</p>
      )}
    </div>
  );
}

/**
 * Renders the card.
 *
 * @param props - the card's data, the class's address and whether the viewer is the teacher
 * @returns the section
 */
export function WinnerCard({ card, slug, isTeacher }: WinnerCardProps) {
  const { t } = useClassCompetitionsTranslation();
  const state = card.winner === null ? t('winner.noWinnerEyebrow') : t('winner.eyebrow');
  return (
    <section
      aria-label={t('winner.regionLabel', { state, name: card.name })}
      className="flex flex-col gap-1 rounded-card bg-surface-solid p-6"
    >
      {/* "Winner" in bold, then the competition's name, as one meta line (board G03). */}
      <MetaLine facts={[{ text: state, kind: 'state' }, { text: card.name }]} />
      <WinnerLines card={card} />
      {card.readersChoice.length > 0 && (
        <p className="m-0 type-body text-ink-muted">
          <span className="font-semibold text-ink">{t('winner.readersChoice')}</span>{' '}
          {card.readersChoice.join(', ')}
        </p>
      )}
      <MyResult card={card} />
      {isTeacher && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
          <Link
            to={`/spaces/${slug}/competition/${card.id}/results`}
            className="font-semibold text-link underline"
          >
            {t('winner.seeResults')}
          </Link>
          <Link
            to={`/spaces/${slug}/certificates?competition=${card.id}`}
            className="font-semibold text-link underline"
          >
            {t('winner.issueCertificates')}
          </Link>
        </div>
      )}
    </section>
  );
}
