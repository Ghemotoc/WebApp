/**
 * ClassicWorkForm: "Add a classic work" and "Edit details" on /staff/classics (story S1-E11-16
 * AC 1 and 2): the author, the story fields and the public-domain details, with the per-market
 * check shown as staff type.
 *
 * Who shows it: ClassicsPage (a new work) and ClassicCard (an existing one).
 * What it calls: ClassicAuthorFields, ClassicStoryFields, ClassicSourceFields, FreeMarketsList
 * (with lib/publicDomain.ts) and, on Save, onSave(details, newAuthor). Saving keeps the work a
 * draft; nothing is public until Publish.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import type { ClassicAuthorChoice, ClassicDetails } from '../../api/classics';
import { freeMarketsIn, romanianYear } from '../../lib/publicDomain';

import { ClassicAuthorFields, newAuthorChoice, type NewAuthor } from './ClassicAuthorFields';
import { ClassicSourceFields } from './ClassicSourceFields';
import { ClassicStoryFields } from './ClassicStoryFields';
import { FreeMarketsList } from './FreeMarketsList';

/** What the form needs. */
export interface ClassicWorkFormProps {
  initial: ClassicDetails;
  authors: ClassicAuthorChoice[];
  isSaving: boolean;
  /** Saves; a new author (when chosen) is added first. */
  onSave: (details: ClassicDetails, newAuthor: NewAuthor | null) => Promise<unknown>;
  onCancel: () => void;
}

/**
 * The author's year of death as the check needs it.
 *
 * @returns the year, or null when none is known yet
 */
function authorDiedYear(
  authors: ClassicAuthorChoice[],
  authorChoice: string,
  newAuthor: NewAuthor,
): number | null {
  if (authorChoice === newAuthorChoice) {
    return newAuthor.diedYear === '' ? null : Number(newAuthor.diedYear);
  }
  return authors.find((author) => author.id === authorChoice)?.diedYear ?? null;
}

/**
 * Renders the form.
 *
 * @returns the details form with the live check and the buttons
 */
export function ClassicWorkForm({
  initial,
  authors,
  isSaving,
  onSave,
  onCancel,
}: ClassicWorkFormProps) {
  const { t } = useTranslation('staff');
  const [details, setDetails] = useState(initial);
  const [authorChoice, setAuthorChoice] = useState(initial.authorId);
  const [newAuthor, setNewAuthor] = useState<NewAuthor>({ name: '', diedYear: '' });
  const update = (field: keyof ClassicDetails, value: string) =>
    setDetails((previous) => ({ ...previous, [field]: value }));
  // The check as staff type; the database decides again on Publish.
  const yearOf = (text: string) => (text === '' ? null : Number(text));
  const check = freeMarketsIn(
    {
      authorDied: authorDiedYear(authors, authorChoice, newAuthor),
      translatorDied: yearOf(details.translatorDiedYear),
      firstPublished: yearOf(details.firstPublishedYear),
    },
    romanianYear(new Date()),
  );

  /** Sends the details, with the new author when one is being added. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const isNew = authorChoice === newAuthorChoice;
    void onSave({ ...details, authorId: isNew ? '' : authorChoice }, isNew ? newAuthor : null);
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-6 rounded-card border border-border bg-surface p-5"
      onSubmit={handleSubmit}
    >
      <ClassicAuthorFields
        authors={authors}
        authorChoice={authorChoice}
        newAuthor={newAuthor}
        onPick={setAuthorChoice}
        onNewAuthor={setNewAuthor}
      />
      <ClassicStoryFields details={details} onChange={update} />
      <ClassicSourceFields details={details} onChange={update} />
      <section aria-labelledby="classic-check-heading" className="flex flex-col gap-2">
        <h3 id="classic-check-heading" className="m-0 font-heading text-lg font-bold text-heading">
          {t('classics.check.heading')}
        </h3>
        <FreeMarketsList freeMarkets={check} />
      </section>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t('classics.form.saving') : t('classics.form.save')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('classics.form.cancel')}
        </Button>
      </div>
    </form>
  );
}
