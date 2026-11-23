/**
 * ForumRulesCard: "Forum rules in short" beside the forum index, with the link to the community
 * guidelines (bundle FORUMS-1, part a; board 5.1). Interface text, so it lives in the locale
 * files and staff can change it from Interface text (S1-E11-18).
 * Since CALM-7c (board simplified/New-Together) it sits on the page, not on a panel: a
 * subheading, the three rules and the link as a text button.
 *
 * Who uses it: ForumsPage, ForumPage and NewThreadPage. It calls nothing.
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';

import { useForumsTranslation } from '../registerForumsTranslations';

/**
 * Renders the section.
 *
 * @returns a section with three rules and the link
 */
export function ForumRulesCard() {
  const { t } = useForumsTranslation();
  const rules = [t('rules.first'), t('rules.second'), t('rules.third')];
  return (
    <section aria-labelledby="forum-rules-heading" className="flex flex-col">
      <h2 id="forum-rules-heading" className="m-0 type-subheading">
        {t('rules.title')}
      </h2>
      <ul className="m-0 mt-2 flex list-disc flex-col gap-2 pl-4 text-ink-muted">
        {rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      <Link to="/legal/guidelines" className={`${buttonClassName({ variant: 'text' })} self-start`}>
        {t('rules.guidelines')}
      </Link>
    </section>
  );
}
