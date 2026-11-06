/**
 * BlockedCategoriesSection: what no ad or sponsor may promote, for any age (story S1-E12-02;
 * Robert, 2 Nov 2026; board AdminSponsors "Blocked categories").
 *
 * The fixed categories (gambling and betting, tobacco and nicotine, alcohol, politics and dating)
 * carry a "Fixed" pill and no Remove button; the server refuses to remove them anyway. Staff add
 * others with a key and a name in both languages, and remove their own with a reason.
 * Who shows it: StaffSponsorsPage. What it calls: useSponsorChanges().
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';
import { TextInput } from '@/components/ui/TextInput';

import type { BlockedCategory } from '../../api/sponsors';
import { useSponsorChanges } from '../../hooks/useSponsorsAdmin';
import { useSponsorTranslation } from '../../registerSponsorTranslations';

import { ChangeOutcome } from './ChangeOutcome';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** Remove with a reason, for a category staff added. */
function RemoveCategory({ category, label }: { category: BlockedCategory; label: string }) {
  const { t } = useSponsorTranslation();
  const changes = useSponsorChanges();
  const [isAsking, setIsAsking] = useState(false);
  const [reason, setReason] = useState('');
  if (!isAsking) {
    return (
      <Button variant="text" onClick={() => setIsAsking(true)}>
        {t('blocked.remove', { label })}
      </Button>
    );
  }
  return (
    <div className="flex w-full flex-col gap-2">
      <TextInput
        id={`blocked-reason-${category.key}`}
        label={t('blocked.reason', { label })}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <div>
        <Button
          variant="destructive"
          disabled={changes.isRunning}
          onClick={() =>
            void changes
              .change({ kind: 'remove_blocked', key: category.key, reason })
              .catch(errorShownByHook)
          }
        >
          {t('blocked.confirmRemove')}
        </Button>
      </div>
      <ChangeOutcome successText={null} isDone={changes.isDone} failure={changes.failure} />
    </div>
  );
}

/** The add form. */
function AddCategoryForm() {
  const { t } = useSponsorTranslation();
  const changes = useSponsorChanges();
  const [draft, setDraft] = useState({ key: '', labelRo: '', labelEn: '' });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void changes
      .change({ kind: 'add_blocked', ...draft })
      .then(() => setDraft({ key: '', labelRo: '', labelEn: '' }))
      .catch(errorShownByHook);
  };
  const fields = [
    { name: 'key', lang: undefined },
    { name: 'labelRo', lang: 'ro' },
    { name: 'labelEn', lang: 'en' },
  ] as const;
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid gap-4 md:grid-cols-3">
        {fields.map((field) => (
          <TextInput
            key={field.name}
            id={`blocked-${field.name}`}
            label={t(`blocked.${field.name}`)}
            lang={field.lang}
            required
            maxLength={field.name === 'key' ? 40 : 80}
            value={draft[field.name]}
            onChange={(event) => setDraft({ ...draft, [field.name]: event.target.value })}
          />
        ))}
      </div>
      <div>
        <Button type="submit" variant="secondary" disabled={changes.isRunning}>
          {t('blocked.add')}
        </Button>
      </div>
      <ChangeOutcome
        successText={t('blocked.added')}
        isDone={changes.isDone}
        failure={changes.failure}
      />
    </form>
  );
}

/**
 * Renders the section.
 *
 * @returns the list and the add form
 */
export function BlockedCategoriesSection({ categories }: { categories: BlockedCategory[] }) {
  const { t, i18n } = useSponsorTranslation();
  return (
    <section aria-labelledby="blocked-heading" className="flex flex-col gap-3">
      <h2 id="blocked-heading" className="m-0 font-heading text-[22px] font-bold text-heading">
        {t('blocked.heading')}
      </h2>
      <p className="m-0 text-body">{t('blocked.intro')}</p>
      <ul className="m-0 flex list-none flex-col p-0 text-sm">
        {categories.map((category) => {
          const label = i18n.language === 'ro' ? category.labelRo : category.labelEn;
          return (
            <li
              key={category.key}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-hairline py-2"
            >
              <span className="font-semibold text-ink">{label}</span>
              {category.isFixed ? (
                <InfoPill tone="plum">{t('blocked.fixed')}</InfoPill>
              ) : (
                <RemoveCategory category={category} label={label} />
              )}
            </li>
          );
        })}
      </ul>
      <AddCategoryForm />
    </section>
  );
}
