/**
 * SpaceMembersList: the "Members" section of a space's members page: "Find a member", the people
 * 50 at a time (the owner first, then the moderators with their powers, then the members by when
 * they joined), "Show 50 more" and the note on what removing does (bundle FORUMS-2, part b;
 * S1-E8-07; redrawn as board F11 in bundle BOOKS-7, user stories 7.7, 7.10 and 7.11).
 *
 * Who shows it: SpaceMembersPage, for whoever holds the members power. What it calls:
 * useSpaceMembers → space_member_list(); useSpaceMemberChanges for each change; SpaceMemberRow.
 */
import { useId, useState } from 'react';

import { Notice } from '@/components/ui/Notice';

import type { SpaceMember } from '../api/spaceModeration';
import type { Space } from '../api/spaces';
import { useSpaceMembers } from '../hooks/useSpaceModeration';
import { spaceFailureText } from '../lib/spaceFailures';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceMemberRow } from './SpaceMemberRow';
import { useSpaceMemberChanges } from '../hooks/useSpaceMemberChanges';

/** How many people show at first, and how many more each "Show 50 more" adds (the board). */
const pageSize = 50;

/**
 * Whether a member matches what was typed in "Find a member": their name or username.
 *
 * @param member - the member
 * @param search - what was typed, lower case and trimmed
 * @returns true when they match, or when nothing was typed
 */
function matches(member: SpaceMember, search: string): boolean {
  if (search === '') return true;
  if (member.person === null) return false;
  const words = `${member.person.displayName} ${member.person.handle}`.toLowerCase();
  return words.includes(search.replace(/^@/, ''));
}

/**
 * "Find a member": a search field whose name is also written inside it, as the board draws.
 *
 * @param props.id - the field's id
 * @param props.value - what is typed
 * @param props.onChange - keeps what is typed
 * @returns the field
 */
function MemberSearch({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useSpacesTranslation();
  return (
    <div className="w-full max-w-[360px]">
      <input
        id={id}
        type="search"
        aria-label={t('members.find')}
        placeholder={t('members.find')}
        value={value}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        className="field-box h-11 w-full rounded-field px-4 font-body type-body"
      />
    </div>
  );
}

/**
 * Renders the section.
 *
 * @param props.space - the space
 * @returns the section with its heading
 */
export function SpaceMembersList({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const fieldId = useId();
  const members = useSpaceMembers(space.slug, true);
  const changes = useSpaceMemberChanges(space.slug);
  const [search, setSearch] = useState('');
  const [shown, setShown] = useState(pageSize);
  const found = (members.data ?? []).filter((member) =>
    matches(member, search.trim().toLowerCase()),
  );
  return (
    <section aria-labelledby={`${fieldId}-heading`} className="flex flex-col gap-4">
      <h2
        id={`${fieldId}-heading`}
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('members.title')}
      </h2>
      <MemberSearch id={fieldId} value={search} onChange={setSearch} />
      <p aria-live="polite" className="m-0 type-body text-ink-muted empty:hidden">
        {changes.message}
      </p>
      {changes.failure !== null && (
        <Notice tone="error">{t(...spaceFailureText(changes.failure))}</Notice>
      )}
      {members.isError && <Notice tone="error">{t('members.loadFailed')}</Notice>}
      {members.isSuccess && found.length === 0 && (
        <p className="m-0 type-body text-ink-muted">{t('members.noMatch')}</p>
      )}
      {found.length > 0 && (
        <ul className="m-0 max-w-[640px] list-none border-b border-border p-0">
          {found.slice(0, shown).map((member) => (
            <SpaceMemberRow
              key={member.person?.handle ?? member.joinedAt}
              member={member}
              mayAppoint={space.viewer.canAppoint}
              actions={changes.actions}
              isRunning={changes.isRunning}
            />
          ))}
        </ul>
      )}
      {found.length > shown && (
        <button
          type="button"
          onClick={() => setShown((count) => count + pageSize)}
          className="h-11 w-full rounded-full button-glass px-6 type-label font-semibold"
        >
          {t('members.showMore')}
        </button>
      )}
      <p className="m-0 type-meta text-ink-muted">{t('members.footnote')}</p>
    </section>
  );
}
