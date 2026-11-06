/**
 * ProfileSafetyCard: "Something wrong here?" with Report profile and Block (story S1-E5-05;
 * board 6.1, the last card of the side column).
 *
 * Report is Lane C's shared <ReportButton> with the username as the reference (S1-E10-01;
 * CLAUDE.md rule 6). Block opens BlockDialog. When the reader already blocks this person the card
 * says so and offers Unblock instead. Not shown on one's own profile, and not to signed-out
 * visitors (both actions need an account; the report dialog would only say "log in"). The card
 * wears the board's shield with a heart and Block its doodle sign (LOOK-5); the report dialog
 * itself stays plain, as the DoD asks of reporting screens.
 * Who uses it: WriterProfilePage.
 */
import { useState } from 'react';
import { usePeopleTranslation } from '../registerPeopleTranslations';

import blockIcon from '@/assets/icons/block.svg';
import { Doodle } from '@/components/ui/Doodle';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { WriterProfile } from '../api/writerProfile';
import { useBlock } from '../hooks/useBlock';

import { BlockDialog } from './BlockDialog';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** The card when the reader blocks this person: what that means, and Unblock. */
function BlockedCard({ profile }: { profile: WriterProfile }) {
  const { t } = usePeopleTranslation();
  const block = useBlock();
  return (
    <Card className="flex flex-col gap-3 bg-tint">
      <h2 className="m-0 font-heading text-xl font-bold text-ink">
        {t('profile.youBlockTitle', { handle: profile.handle })}
      </h2>
      <p className="m-0 text-[15px] text-body">{t('profile.youBlockBody')}</p>
      {block.hasFailed && <Notice tone="error">{t('safety.unblockFailed')}</Notice>}
      <div>
        <Button
          variant="secondary"
          disabled={block.isSaving}
          onClick={() => void block.change(profile.handle, false).catch(errorShownByHook)}
        >
          {t('safety.unblock', { name: profile.displayName })}
        </Button>
      </div>
    </Card>
  );
}

/**
 * Renders the card.
 *
 * @returns the card, or the blocked notice with Unblock
 */
export function ProfileSafetyCard({ profile }: { profile: WriterProfile }) {
  const { t } = usePeopleTranslation();
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  if (profile.iBlocked) return <BlockedCard profile={profile} />;
  return (
    <Card className="relative flex flex-col gap-3 bg-tint">
      {/* The board's shield with a heart, above the card's top right corner (LOOK-5). */}
      <Doodle
        name="shield-with-heart"
        kind="widget"
        on="Something wrong here?"
        hideBelow="phone"
        className="absolute -top-10 right-4 w-[56px] rotate-6"
      />
      <h2 className="m-0 font-heading text-xl font-bold text-ink">{t('safety.heading')}</h2>
      <p className="m-0 text-[15px] text-body">{t('safety.body')}</p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <ReportButton
          itemType="profile"
          itemReference={profile.handle}
          itemLabel={`@${profile.handle}`}
        />
        <Button variant="destructive" aria-haspopup="dialog" onClick={() => setIsBlockOpen(true)}>
          {/* The board's doodle "no entry" sign before the words (LOOK-5); the words name it. */}
          <img src={blockIcon} alt="" aria-hidden="true" width={20} height={20} />
          {t('safety.block', { name: profile.displayName })}
        </Button>
      </div>
      <BlockDialog
        isOpen={isBlockOpen}
        onClose={() => setIsBlockOpen(false)}
        handle={profile.handle}
      />
    </Card>
  );
}
