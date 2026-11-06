/**
 * ProfileSignatureCard: "Forum signature" on a writer's profile (story S1-E8-08; board 6.1, the
 * side column's second card).
 *
 * Board values: a white card with 24 px corners, the eyebrow "Forum signature" (the
 * heading itself is for screen readers only, as the board draws it), the signature box and a
 * 13 px line saying where it shows ("Shows under inkwolf’s forum posts on bigger screens").
 * Nothing is drawn when the person has no signature, or the reader may not see their profile.
 * Who uses it: WriterProfilePage. What it calls: useProfileSignature → profile_signature().
 */
import { Card } from '@/components/ui/Card';

import { useProfileSignature } from '../hooks/useForumSignatures';
import { useForumsTranslation } from '../registerForumsTranslations';

import { SignatureBody } from './SignatureBody';

/** What the card needs. */
export interface ProfileSignatureCardProps {
  handle: string;
  /** The profile's display name, for the picture's description. */
  name: string;
}

/**
 * Renders the card.
 *
 * @returns the card, or nothing when there is no signature
 */
export function ProfileSignatureCard({ handle, name }: ProfileSignatureCardProps) {
  const { t } = useForumsTranslation();
  const signature = useProfileSignature(handle).data ?? null;
  if (signature === null) return null;
  return (
    <Card>
      <section aria-labelledby="profile-signature-heading" className="flex flex-col gap-3.5">
        <p aria-hidden="true" className="m-0 eyebrow">
          {t('signature.eyebrow')}
        </p>
        <h2 id="profile-signature-heading" className="sr-only">
          {t('signature.eyebrow')}
        </h2>
        <SignatureBody signature={signature} name={name} size="card" />
        <p className="m-0 text-[13px] leading-normal text-meta">
          {t('signature.whereItShows', { handle })}
        </p>
      </section>
    </Card>
  );
}
