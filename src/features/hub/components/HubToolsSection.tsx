/**
 * HubToolsSection: "Tools for the next chapter" on the Home page (bundle CALM-7c; since CALM-9 the
 * dark Tools band of board A01, canvas comments approved by Robert on 23 Nov 2026).
 *
 * The band is the deep plum band the home page's writers' band uses (a solid box at night,
 * NIGHT-2). Its heading and "Guides" (which opens Resources with every guide) sit at the top in
 * the band's text colour. The prompt of the week sits on its reading paper on the left, with
 * "Draw inspiration from new and rising writers" under it in the same column (A01: the writers
 * moved here from a row of their own); the guides (and the next live session) sit on the right as quiet rows on the band itself
 * (HubToolsGuides; board A01, Robert's review of 25 Nov 2026). Under 900 px the
 * parts stack. Without a prompt or writers the guides take the whole width.
 * Who shows it: MemberHomePage. What it calls: HubPrompt, HubToolsGuides, RisingWritersList and their
 * hooks (useHubPrompts, useRisingWriters), only to know whether the left column has anything.
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { RisingWritersList } from '@/features/discovery/components/RisingWritersList';
import { useRisingWriters } from '@/features/discovery/hooks/useRisingWriters';
import { cn } from '@/lib/utils';

import { useHubPrompts } from '../hooks/useHubPrompts';
import { useHubTranslation } from '../registerHubTranslations';

import { HubToolsGuides } from './HubToolsGuides';
import { HubPrompt } from './HubPrompt';

/** The reading paper the prompt sits on inside the band. */
const paperClasses = 'box-surface rounded-card p-4 sm:p-6';

/**
 * Renders the section.
 *
 * @param props.now - today, for the prompt's days left
 * @returns the section
 */
export function HubToolsSection({ now }: { now: Date }) {
  const { t } = useHubTranslation();
  // The left column shows only with a prompt (or its load error) or writers to suggest; without
  // them the guides take the whole width instead of sitting beside an empty column (Robert's
  // review of 25 Nov 2026). The hooks share their cache with the parts, so nothing loads twice.
  const { prompts, loadFailed } = useHubPrompts();
  const { writers } = useRisingWriters();
  const hasLeftColumn = prompts.length > 0 || loadFailed || writers.length > 0;
  return (
    <section
      aria-labelledby="hub-tools-heading"
      className="flex flex-col gap-6 rounded-card bg-primary glass-band-deep p-4 lg:p-8"
    >
      {/* Step 1: the heading and the Guides link, in the band's own text colour. */}
      <div className="flex items-center justify-between gap-4">
        <h2 id="hub-tools-heading" className="m-0 max-w-[20ch] type-display text-on-primary">
          {t('hub.tools.heading')}
        </h2>
        <Link
          to="/resources"
          className={cn(buttonClassName({ variant: 'text' }), 'text-on-primary')}
        >
          {t('hub.tools.guidesLink')}
        </Link>
      </div>
      {/* Step 2: the prompt on paper with the writers under it, and the guides as rows. */}
      <div
        className={cn(
          'grid items-start gap-8',
          hasLeftColumn && 'min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]',
        )}
      >
        {hasLeftColumn && (
          <div className="flex flex-col gap-8">
            <div className={cn(paperClasses, 'empty:hidden')}>
              <HubPrompt now={now} />
            </div>
            <RisingWritersList tone="band" headingId="hub-writers-heading" />
          </div>
        )}
        <HubToolsGuides />
      </div>
    </section>
  );
}
