/**
 * HubHero: the top card of the Writers' hub (bundle G9 WRITING, part a; board WritersHub, the
 * glass hero with "Writers' hub · Friday 7 November", the heading, a short line and two pills).
 *
 * Left out (docs/board-fixes.md): the board's "Writing month" streak ring, because no word goals
 * or streaks exist yet, and "This week's prompt", because there is no prompt of the week. The
 * second pill opens Resources instead.
 * Who shows it: WritersHubPage. What it calls: lib/hubDates.ts and react-router's Link.
 */
import { Link } from 'react-router';

import { NavIcon } from '@/components/icons/NavIcon';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { Eyebrow } from '@/components/ui/Eyebrow';

import { formatHubDay } from '../lib/hubDates';
import { useHubTranslation } from '../registerHubTranslations';

/**
 * Renders the hero. The page's one h1 is here.
 *
 * @param props.now - today, passed in so tests can fix the date
 * @returns the hero card
 */
export function HubHero({ now }: { now: Date }) {
  const { t, i18n } = useHubTranslation();
  return (
    <section
      aria-labelledby="hub-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-[clamp(24px,4vw,40px)] shadow-card"
    >
      <Eyebrow>{t('hub.eyebrow', { day: formatHubDay(now, i18n.language) })}</Eyebrow>
      <h1 id="hub-heading" className="page-title">
        {t('hub.heading')}
      </h1>
      <p className="m-0 max-w-[620px] text-lg leading-relaxed text-body">{t('hub.intro')}</p>
      {/* Start writing is the main pill; Resources is the clear one (board: plum and clear). */}
      <div className="flex flex-wrap gap-2.5">
        <Link to="/write/new" className={buttonClassName({ variant: 'primary', size: 'lg' })}>
          <NavIcon name="write" size={18} />
          {t('hub.startWriting')}
        </Link>
        <Link to="/resources" className={buttonClassName({ variant: 'secondary', size: 'lg' })}>
          {t('hub.resources')}
        </Link>
      </div>
    </section>
  );
}
