/**
 * useMemberFacts: the facts under a member's name on the members page, as one meta line: "Owner ·
 * started the space, March 2026", "Moderator · posts and members · joined April 2026" or "Member
 * · joined May 2026", plus "invited: posts" while an invitation waits (bundle BOOKS-7, board F11).
 *
 * Who calls it: SpaceMemberRow. What it calls: nothing; it only picks words.
 */
import type { MetaFact } from '@/components/ui/MetaLine';
import { dateLocaleFor } from '@/lib/romania-time';

import type { SpaceMember } from '../api/spaceModeration';
import { powerKeys } from '../lib/spacePowers';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * The member's facts, in the reader's language.
 *
 * @param member - the member
 * @returns the facts, their place first
 */
export function useMemberFacts(member: SpaceMember): MetaFact[] {
  const { t, i18n } = useSpacesTranslation();
  const listFormat = new Intl.ListFormat(dateLocaleFor(i18n.language), { type: 'conjunction' });
  const monthFormat = new Intl.DateTimeFormat(dateLocaleFor(i18n.language), {
    month: 'long',
    year: 'numeric',
  });
  const month = member.joinedAt === '' ? '' : monthFormat.format(new Date(member.joinedAt));
  const powersIn = (powers: SpaceMember['powers']) =>
    listFormat.format(powerKeys(powers).map((key) => t(key)));
  // The owner started the space; everyone else joined it.
  if (member.role === 'owner') {
    return [{ text: t('runs.owner') }, { text: t('members.started', { month }) }];
  }
  const facts: MetaFact[] = [];
  if (member.role === 'moderator') {
    facts.push({ text: t('members.moderator') }, { text: powersIn(member.powers) });
  } else {
    facts.push({ text: t('members.member') });
  }
  facts.push({ text: t('members.joinedMonth', { month }) });
  if (member.invitedPowers !== null) {
    facts.push({ text: t('members.invitedFact', { powers: powersIn(member.invitedPowers) }) });
  }
  return facts;
}
