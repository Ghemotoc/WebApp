/**
 * HubToolsSection: "Tools for the next chapter" on the Home page (bundle CALM-7c; board New-Home:
 * the prompt of the week on the left, the guides as rows on the right, and "Guides" at the top
 * right, which opens Resources with every guide).
 *
 * Under 900 px the two parts stack. Without a prompt the guides take the whole width.
 * Who shows it: WritersHubPage. What it calls: HubPrompt and HubGuides.
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';

import { useHubTranslation } from '../registerHubTranslations';

import { HubGuides } from './HubGuides';
import { HubPrompt } from './HubPrompt';

/**
 * Renders the section.
 *
 * @param props.now - today, for the prompt's days left
 * @returns the section
 */
export function HubToolsSection({ now }: { now: Date }) {
  const { t } = useHubTranslation();
  return (
    <section aria-labelledby="hub-tools-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="hub-tools-heading" className="m-0 type-heading">
          {t('hub.tools.heading')}
        </h2>
        <Link to="/resources" className={buttonClassName({ variant: 'text' })}>
          {t('hub.tools.guidesLink')}
        </Link>
      </div>
      <div className="grid items-start gap-10 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] min-[900px]:gap-14 [&>*:only-child]:col-span-full">
        <HubPrompt now={now} />
        <HubGuides />
      </div>
    </section>
  );
}
