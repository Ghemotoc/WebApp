/**
 * HubSpotlight: "Writer of the week" on the Writers' hub (bundle GAPS-12e; board WritersHub,
 * "Writer of the week · staff pick").
 *
 * The writer staff picked for these 7 days: avatar, name as a link to the profile, staff's one
 * line on why and Follow. It shows only once the writer agreed, and never when the reader and
 * the writer block each other; the database decides both (writers_hub_spotlight()). With no
 * agreed pick the card stays away. The board's "Read the interview" has nothing behind it yet
 * (docs/board-fixes.md).
 * Who shows it: WritersHubPage. What it calls: useHubSpotlight, PersonAvatar and FollowButton.
 */
import { Link } from 'react-router';

import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import { PersonAvatar } from '@/features/avatars/components/PersonAvatar';
import { FollowButton } from '@/features/people/components/FollowButton';

import { useHubSpotlight } from '../hooks/useHubSpotlight';
import { useHubTranslation } from '../registerHubTranslations';

/**
 * Renders the card.
 *
 * @returns the card, a plain message when it can't be read, or nothing without an agreed pick
 */
export function HubSpotlight() {
  const { t, i18n } = useHubTranslation();
  const { spotlight, loadFailed } = useHubSpotlight();
  if (loadFailed) return <Notice tone="error">{t('hub.spotlight.loadFailed')}</Notice>;
  if (spotlight === null) return null;
  // Staff's line in the interface language.
  const reason = i18n.language === 'ro' ? spotlight.reasonRo : spotlight.reasonEn;
  return (
    <section
      aria-labelledby="hub-spotlight"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card md:p-8"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="hub-spotlight" className="eyebrow m-0">
          {t('hub.spotlight.eyebrow')}
        </h2>
        <InfoPill tone="plum">{t('hub.spotlight.staffPick')}</InfoPill>
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <PersonAvatar name={spotlight.displayName} handle={spotlight.handle} size="xlarge" />
        <div className="flex min-w-0 flex-col">
          <Link
            to={`/u/${encodeURIComponent(spotlight.handle)}`}
            className="max-w-full font-heading text-[22px] leading-tight font-bold wrap-anywhere text-link underline"
          >
            {spotlight.displayName}
          </Link>
          <span className="text-sm wrap-anywhere text-meta">@{spotlight.handle}</span>
        </div>
      </div>
      <p className="m-0 text-base wrap-anywhere text-body">{reason}</p>
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
