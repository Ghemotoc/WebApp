/**
 * HubWritersHero: the top of the Writers' hub at /hub (user story 1.3, board A03-WritersHub).
 *
 * Left: "Writers' hub · Friday 7 November", the two-line title "Everything for your / next
 * chapter." (the second line in the accent colour), one line on what the page holds and the one
 * main button, Start writing: it opens the editor on the last draft, or New story when there is
 * none. Right, from 900 px: the words written this month (HubWordsThisMonth).
 * Who shows it: WritersHubPage. What it calls: useDiscoverCards (the latest draft), hubDates and
 * HubWordsThisMonth.
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { Hero } from '@/components/ui/Hero';
import { MetaLine } from '@/components/ui/MetaLine';
import { useDiscoverCards } from '@/features/discovery/hooks/useDiscoverCards';

import { formatHubDay } from '../lib/hubDates';
import { useHubTranslation } from '../registerHubTranslations';

import { HubWordsThisMonth } from './HubWordsThisMonth';

/**
 * Where Start writing leads: the editor on the last draft, or a new story (story 1.3).
 *
 * @returns the address
 */
function useStartWritingAddress(): string {
  const { cards } = useDiscoverCards();
  const draft = cards?.draft ?? null;
  if (draft === null) return '/write/new';
  return `/write/s/${encodeURIComponent(draft.storySlug)}/c/${draft.chapterCode}`;
}

/**
 * Renders the hero. The page's one h1 is here.
 *
 * @param props.now - today, passed in so tests can fix the date
 * @returns the hero
 */
export function HubWritersHero({ now }: { now: Date }) {
  const { t, i18n } = useHubTranslation();
  const startAddress = useStartWritingAddress();
  return (
    <Hero
      labelledBy="hub-heading"
      className="min-[900px]:grid min-[900px]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] min-[900px]:items-center min-[900px]:gap-12 min-[900px]:p-12"
    >
      <div className="flex flex-col gap-3">
        <MetaLine
          facts={[{ text: t('hub.writersHub.place') }, { text: formatHubDay(now, i18n.language) }]}
        />
        {/* Two lines on the board, the second in the accent colour. */}
        <h1 id="hub-heading" className="m-0 type-title break-words lg:type-display">
          {t('hub.writersHub.titleFirst')}
          <br />
          <span className="text-accent">{t('hub.writersHub.titleSecond')}</span>
        </h1>
        <p className="m-0 text-ink-muted">{t('hub.writersHub.intro')}</p>
        <div className="flex flex-wrap gap-3">
          <Link to={startAddress} className={buttonClassName({ variant: 'primary' })}>
            {t('hub.writersHub.startWriting')}
          </Link>
        </div>
      </div>
      <div className="mt-6 min-[900px]:mt-0">
        <HubWordsThisMonth />
      </div>
    </Hero>
  );
}
