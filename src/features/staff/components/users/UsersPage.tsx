/**
 * UsersPage: /staff/users, the Accounts tab of the Users area (story S1-E11-02; board AdminUsers
 * 8.5; architecture 1.8.2 and 1.8.4).
 *
 * Staff search by username, pen name, whole email or user ID; the results show status, the age
 * check result and date, sanctions and open cases, and each account opens its page. Plain
 * components, no doodles (DoD: staff screens).
 * Who shows it: the router, inside StaffLayout. The database refuses anyone but owner, admin,
 * moderator and support (admin_user_lookup()), and the page says so.
 * What it calls: useUserLookup → api/userManagement.ts.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { TextInput } from '@/components/ui/TextInput';
import { registerModerationTranslations } from '@/features/moderation/registerModerationTranslations';

import { useUserLookup } from '../../hooks/useUserLookup';

import { UserResults } from './UserResults';
import { UsersTabs } from './UsersTabs';

/** useUserLookup's result, passed down once. */
type Lookup = ReturnType<typeof useUserLookup>;

/**
 * The search field and its button. Searching on submit, not on every key, so each logged email
 * lookup is one the person meant.
 *
 * @returns the form
 */
function UserSearchForm({ lookup }: { lookup: Lookup }) {
  const { t } = useTranslation('staff');
  const [text, setText] = useState(lookup.searchedText);

  /** Runs the search with what was typed. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    lookup.search(text);
  }

  return (
    <form
      role="search"
      aria-label={t('users.searchFormLabel')}
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="w-full max-w-[480px]">
        <TextInput
          id="users-search"
          label={t('users.searchLabel')}
          hint={t('users.searchHint')}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={lookup.isSearching}>
        {t('users.search')}
      </Button>
    </form>
  );
}

/**
 * What goes under the search: a refusal, an error, a hint or the results.
 *
 * @returns the results part
 */
function UserSearchResults({ lookup }: { lookup: Lookup }) {
  const { t } = useTranslation('staff');
  if (lookup.failure === 'not_allowed')
    return <p className="m-0 text-body">{t('users.notAllowed')}</p>;
  if (lookup.failure !== null)
    return <Notice tone="error">{t(`users.failures.${lookup.failure}`)}</Notice>;
  if (!lookup.hasSearched) return <p className="m-0 text-body">{t('users.beforeSearch')}</p>;
  if (lookup.isTooShort) return <p className="m-0 text-body">{t('users.tooShort')}</p>;
  if (lookup.isSearching) return null;
  return (
    <section aria-labelledby="users-results-heading" className="flex flex-col gap-3">
      <h2
        id="users-results-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {t('users.resultsHeading')}
      </h2>
      <p role="status" className="m-0 text-sm text-meta">
        {t('users.found', { count: lookup.results.length })}
      </p>
      {lookup.results.length > 0 && <UserResults matches={lookup.results} />}
      <p className="m-0 text-sm text-meta">{t('users.ageNote')}</p>
    </section>
  );
}

/**
 * Renders the page.
 *
 * @returns the Users screen
 */
export function UsersPage() {
  const { i18n } = useTranslation();
  registerModerationTranslations(i18n);
  const { t } = useTranslation('staff');
  const lookup = useUserLookup();
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('users.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('users.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('users.heading')}
        </h1>
        <p className="m-0 text-body">{t('users.intro')}</p>
      </div>
      <UsersTabs />
      <div className="flex max-w-[1100px] flex-col gap-6">
        <UserSearchForm lookup={lookup} />
        <UserSearchResults lookup={lookup} />
      </div>
    </PageContainer>
  );
}
