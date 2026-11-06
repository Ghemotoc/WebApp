/**
 * RankPanel: the "Rank" card at the top of a profile's side column (story S1-E8-09; board 6.1).
 *
 * Board values: a white card with 24 px corners and 24 px padding, the eyebrow "Rank", the
 * rank's name as a 26 px Bricolage heading, the 15 px line saying where ranks come from (forum
 * posts never count, criterion 1), the ladder and the progress bar. The trophy doodle sits on the
 * card's top-right edge as a widget doodle and hides on phones. Nothing is drawn before the
 * writer's first published chapter, or when profile_rank() keeps it from this reader.
 * Who uses it: WriterProfilePage (people feature). What it calls: useProfileRank →
 * profile_rank(), RankLadder and RankProgressBar.
 */
import { Card } from '@/components/ui/Card';
import { Doodle } from '@/components/ui/Doodle';
import { Eyebrow } from '@/components/ui/Eyebrow';

import { useProfileRank } from '../hooks/useWriterRank';
import { useForumsTranslation } from '../registerForumsTranslations';

import { RankLadder } from './RankLadder';
import { RankProgressBar } from './RankProgressBar';

/** What the card needs. */
export interface RankPanelProps {
  handle: string;
  /** The profile's display name, for the top-rank line. */
  name: string;
}

/**
 * Renders the card.
 *
 * @returns the card, or nothing when there is no rank to show
 */
export function RankPanel({ handle, name }: RankPanelProps) {
  const { t } = useForumsTranslation();
  const rank = useProfileRank(handle).data ?? null;
  if (rank === null) return null;
  return (
    <Card className="relative">
      <Doodle
        name="trophy"
        kind="widget"
        on="The rank card"
        hideBelow="phone"
        className="absolute -top-[34px] right-[18px] w-[70px] rotate-[8deg]"
      />
      <section aria-labelledby="profile-rank-heading" className="flex flex-col gap-3.5">
        {/* Only as wide as its word, so the trophy above the card's right edge never meets it. */}
        <div className="self-start">
          <Eyebrow>{t('rank.eyebrow')}</Eyebrow>
        </div>
        <h2
          id="profile-rank-heading"
          className="m-0 font-heading text-[26px] font-bold text-heading"
        >
          {t(`rank.names.${rank.rank}`)}
        </h2>
        <p className="m-0 text-[15px] leading-[1.6] text-body">{t('rank.explainer')}</p>
        <RankLadder current={rank.rank} />
        <RankProgressBar rank={rank} name={name} />
      </section>
    </Card>
  );
}
