/**
 * BeforeYouPost: "Before you post" beside a new thread's form, with the link to the community
 * guidelines (bundle CALM-9b; board simplified F04 and F09). Interface text, so it lives in the
 * locale files and staff can change it from Interface text (S1-E11-18).
 *
 * It sits on the page, not on a panel: a subheading, one short paragraph in the muted body colour
 * and the link as a text button, the same shape as ForumRulesCard on the forum pages.
 * Who uses it: NewThreadPage (and the space's new thread page). It calls nothing.
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';

import { useForumsTranslation } from '../registerForumsTranslations';

/**
 * Renders the section.
 *
 * @returns a block with the heading, the reminder and the link
 */
export function BeforeYouPost() {
  const { t } = useForumsTranslation();
  return (
    // A plain block, not a named region: a region named "Before you post" would answer to the
    // label "Post" too and be mistaken for the post field.
    <div className="flex flex-col gap-2">
      <h2 className="m-0 type-subheading">{t('beforePost.title')}</h2>
      <p className="m-0 text-body">{t('beforePost.text')}</p>
      {/* The text button sits flush with the words above it, as on the board. */}
      <Link
        to="/legal/guidelines"
        className={`${buttonClassName({ variant: 'text' })} -ml-3 self-start`}
      >
        {t('rules.guidelines')}
      </Link>
    </div>
  );
}
