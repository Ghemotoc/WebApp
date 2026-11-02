/**
 * ChangeRequestNotice: a moderator's open request to change a signature or a space's banner
 * picture, with the reason and the time it is removed if left unchanged (story S1-E8-08
 * criterion 3; Q29: changed within 24 hours or removed).
 * Who uses it: SignatureSettingsSection and SpaceBannerPictureCard. What it calls: postTime for
 * the time in the reader's language.
 */
import { Notice } from '@/components/ui/Notice';

import type { ChangeRequest } from '../api/forumSignatures';
import { postTime } from '../lib/forumDates';
import { useForumsTranslation } from '../registerForumsTranslations';

/**
 * Renders the notice.
 *
 * @param props.request - the reason and when it is due
 * @param props.messageKey - the forums text to use (signature.changeRequested or
 *   signature.bannerChangeRequested), given {time} and {reason}
 * @returns the notice
 */
export function ChangeRequestNotice({
  request,
  messageKey,
}: {
  request: ChangeRequest;
  messageKey: string;
}) {
  const { t, i18n } = useForumsTranslation();
  return (
    <Notice tone="warning">
      {t(messageKey, { time: postTime(request.dueAt, i18n.language), reason: request.reason })}
    </Notice>
  );
}
