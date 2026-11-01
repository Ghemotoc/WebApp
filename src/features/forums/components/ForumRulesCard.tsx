/**
 * ForumRulesCard: "Forum rules in short" beside the forum index, with the link to the community
 * guidelines (bundle FORUMS-1, part a; board 5.1). Interface text, so it lives in the locale
 * files and staff can change it from Interface text (S1-E11-18).
 *
 * Who uses it: ForumsPage. It calls nothing.
 */
import { Link } from 'react-router';

import { useForumsTranslation } from '../registerForumsTranslations';

/**
 * Renders the card.
 *
 * @returns an aside section with three rules and the link
 */
export function ForumRulesCard() {
  const { t } = useForumsTranslation();
  const rules = [t('rules.first'), t('rules.second'), t('rules.third')];
  return (
    <section
      aria-labelledby="forum-rules-heading"
      className="flex flex-col gap-3 rounded-card border bg-panel border-panel-border px-6 py-5"
    >
      <h2 id="forum-rules-heading" className="m-0 text-lg font-semibold text-heading">
        {t('rules.title')}
      </h2>
      <ul className="m-0 flex flex-col gap-2 pl-5 text-sm text-body">
        {rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      <Link
        to="/legal/guidelines"
        className="inline-flex min-h-6 items-center text-sm text-link underline"
      >
        {t('rules.guidelines')}
      </Link>
    </section>
  );
}
