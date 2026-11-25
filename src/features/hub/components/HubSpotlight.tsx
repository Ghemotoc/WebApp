/**
 * HubSpotlight: "Writer of the week" on the Writers' hub (GAPS-12e; since user story 1.3 drawn as
 * on board A03-WritersHub, at the top of the side column).
 *
 * The heading, then the writer's avatar beside their name (a link to their profile) and "Staff
 * pick", staff's line about them in the reading font in italics, and Follow. The card shows only
 * once the writer agreed (GAPS-12e); the picked writer sees it without Follow, since nobody
 * follows themselves.
 * Who shows it: WritersHubPage. What it calls: useHubSpotlight, PersonAvatar and FollowButton.
 */
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PersonAvatar } from '@/features/avatars/components/PersonAvatar';
import { FollowButton } from '@/features/people/components/FollowButton';

import { useHubSpotlight } from '../hooks/useHubSpotlight';
import { useHubTranslation } from '../registerHubTranslations';

/**
 * Renders the card.
 *
 * @returns the section, or nothing when no writer is picked this week
 */
export function HubSpotlight() {
  const { t, i18n } = useHubTranslation();
  const { spotlight, loadFailed } = useHubSpotlight();
  if (loadFailed) return <Notice tone="error">{t('hub.spotlight.loadFailed')}</Notice>;
  if (spotlight === null) return null;
  // Staff's line in the interface language.
  const reason = i18n.language === 'ro' ? spotlight.reasonRo : spotlight.reasonEn;
  return (
    <section aria-labelledby="hub-spotlight" className="flex flex-col gap-3">
      <h2 id="hub-spotlight" className="m-0 type-subheading">
        {t('hub.spotlight.eyebrow')}
      </h2>
      <div className="flex min-w-0 items-center gap-3">
        <PersonAvatar name={spotlight.displayName} handle={spotlight.handle} size="xlarge" />
        <div className="flex min-w-0 flex-col">
          <Link
            to={`/u/${encodeURIComponent(spotlight.handle)}`}
            className="type-label font-semibold wrap-anywhere text-ink-heading no-underline hover:underline"
          >
            {spotlight.displayName}
          </Link>
          <span className="type-meta text-ink-muted">{t('hub.spotlight.staffPick')}</span>
        </div>
      </div>
      <p className="m-0 font-story wrap-anywhere text-ink italic">{reason}</p>
      {/* Nobody follows themselves: the picked writer sees the card without the button. */}
      {!spotlight.isMe && (
        <div className="flex flex-wrap items-center gap-3">
          <FollowButton
            target={{ kind: 'writer', handle: spotlight.handle }}
            targetLabel={spotlight.displayName}
          />
        </div>
      )}
    </section>
  );
}
