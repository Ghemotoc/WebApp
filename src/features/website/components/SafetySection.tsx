/**
 * SafetySection: the quiet safety row on the public home page (stories S1-E5-08 and S1-E11-06;
 * board Website-Home; bundle LOOK-2 turns the panel into the board's small row).
 *
 * Board values: a small trust line under "Why write here", reassurance rather than a headline.
 * Each of the two lines (the Yoti line and the one messaging line, Q6 and Q13) has a small icon,
 * and the row ends with a link to the questions further down, worded with the CMS safety
 * heading. The link shows only when the page has questions to jump to. All three texts come
 * from the CMS, so an admin keeps them true for the moment (S1-E5-08 legal note: no Yoti claim
 * while the check isn't live). The row is a list named by the safety heading, so a screen
 * reader still hears what it is about when the link is not there.
 * Who uses it: WebsiteHomePage, which says whether there are questions.
 */
import { ActionIcon, type ActionIconName } from '@/components/icons/ActionIcon';
import type { HomePageContent } from '@/schemas/websiteContent';

import { withBrand } from '../lib/brandText';

/** The id of the questions section, the link's target (WebsiteHomePage). */
export const homeQuestionsAnchor = 'questions';

/** The icon beside each line, in the board's order: the age check (shield), messages (lock). */
const lineIcons: readonly ActionIconName[] = ['shield', 'lock'];

/** What the section needs. */
interface SafetySectionProps {
  page: HomePageContent;
  language: string;
  /** Whether the page shows questions, so the link has somewhere to go. */
  hasQuestions: boolean;
}

/**
 * Renders the row.
 *
 * @returns the list of safety lines
 */
export function SafetySection({ page, language, hasQuestions }: SafetySectionProps) {
  const heading = withBrand(page.safetyHeading);
  return (
    <ul
      aria-label={heading}
      lang={language}
      className="m-0 flex list-none flex-wrap items-center gap-x-7 gap-y-1 p-0 text-sm text-body"
    >
      {page.safetyLines.map((line, index) => (
        <li key={line} className="inline-flex min-h-8 items-center gap-2">
          <ActionIcon
            name={lineIcons[index] ?? 'shield'}
            size={20}
            className="flex-none text-heading"
          />
          {withBrand(line)}
        </li>
      ))}
      {hasQuestions && (
        <li className="inline-flex items-center">
          <a
            href={`#${homeQuestionsAnchor}`}
            className="inline-flex min-h-11 items-center font-semibold text-link"
          >
            {heading}
          </a>
        </li>
      )}
    </ul>
  );
}
