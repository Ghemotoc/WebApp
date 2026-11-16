/**
 * ClassicEditionsPanel: "Editions" on a classic's card on /staff/classics (bundle TRANSLATE-1d;
 * board TrStaff; Robert, 16 Nov 2026: "some classics may come in other languages - how do we do
 * to have them translated mentioning the translator").
 *
 * What it shows: the classic's languages as a table, "Add an edition" (a new language of the same
 * classic, saved as a draft) and, once an edition's "Edit" is pressed, that edition's details,
 * text and publishing tools. An edition shares the classic's author, kind, category and rating;
 * only its language, title, description, translator and translation rights are its own.
 *
 * Who shows it: ClassicCard. What it calls: ClassicEditionsTable, ClassicEditionForm,
 * ClassicEditionTools, useStoryFormOptions (the languages on the list) and onChange (useClassics's
 * change()). Plain components, no doodles (staff screens).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useStoryFormOptions } from '@/features/writing/hooks/useStoryFormOptions';

import type { ClassicWork } from '../../api/classics';
import type { ClassicChange } from '../../hooks/useClassics';

import { ClassicEditionForm, type EditionValues } from './ClassicEditionForm';
import { ClassicEditionsTable } from './ClassicEditionsTable';
import { ClassicEditionTools } from './ClassicEditionTools';

/** What the panel needs. */
export interface ClassicEditionsPanelProps {
  /** The classic's first edition. */
  work: ClassicWork;
  /** Its later editions. */
  editions: ClassicWork[];
  isChanging: boolean;
  onChange: (change: ClassicChange) => Promise<unknown>;
}

/** What is open under the table: nothing, the "Add an edition" form, or one edition (its id). */
type OpenPart = 'none' | 'add' | string;

/**
 * The "Add an edition" form, or a line saying every language is taken.
 *
 * @param props.languageChoices - the languages this classic isn't in yet
 * @param props.onSaved - called with the new edition's story id
 * @returns the form
 */
function AddEdition({
  work,
  languageChoices,
  isChanging,
  onChange,
  onSaved,
  onCancel,
}: Omit<ClassicEditionsPanelProps, 'editions'> & {
  languageChoices: string[];
  onSaved: (storyId: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation('staff');
  if (languageChoices.length === 0) {
    return <p className="m-0 text-body">{t('classics.editions.noLanguagesLeft')}</p>;
  }
  const initial: EditionValues = {
    languageCode: languageChoices[0] ?? '',
    title: '',
    blurb: '',
    translatorName: '',
    translatorDiedYear: '',
    translationRights: '',
  };

  /** Saves the edition as a draft of the same classic, then opens it for its text. */
  async function handleSave(values: EditionValues) {
    // The shared facts (author, kind, category, rating, source) start from the first edition.
    const details = { ...work, ...values, editionOfStoryId: work.storyId };
    const saved = (await onChange({ kind: 'save', storyId: null, details })) as ClassicWork;
    onSaved(saved.storyId);
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <h4 className="m-0 font-heading text-lg font-bold text-heading">
        {t('classics.editions.form.legend')}
      </h4>
      <ClassicEditionForm
        formId={`new-${work.storyId}`}
        initial={initial}
        languageChoices={languageChoices}
        isSaving={isChanging}
        onSave={handleSave}
        onCancel={onCancel}
      />
    </div>
  );
}

/**
 * Renders the panel.
 *
 * @returns the heading, the table and whatever is open under it
 */
export function ClassicEditionsPanel({
  work,
  editions,
  isChanging,
  onChange,
}: ClassicEditionsPanelProps) {
  const { t } = useTranslation('staff');
  const { languages } = useStoryFormOptions();
  const [openPart, setOpenPart] = useState<OpenPart>('none');
  // A classic has one edition per language, so the taken ones are not offered again.
  const taken = [work, ...editions].map((edition) => edition.languageCode);
  const languageChoices = languages.map(({ code }) => code).filter((code) => !taken.includes(code));
  const openEdition = editions.find((edition) => edition.storyId === openPart);
  const headingId = `classic-editions-${work.storyId}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Eyebrow>{t('classics.editions.eyebrow')}</Eyebrow>
          <h4 id={headingId} className="m-0 font-heading text-lg font-bold text-heading">
            {t('classics.editions.heading')}
          </h4>
        </div>
        <Button variant="secondary" onClick={() => setOpenPart('add')}>
          {t('classics.editions.add')}
        </Button>
      </div>
      <ClassicEditionsTable work={work} editions={editions} onEdit={setOpenPart} />
      {openPart === 'add' && (
        <AddEdition
          work={work}
          languageChoices={languageChoices}
          isChanging={isChanging}
          onChange={onChange}
          onSaved={setOpenPart}
          onCancel={() => setOpenPart('none')}
        />
      )}
      {openEdition !== undefined && (
        <ClassicEditionTools
          // A fresh form per edition, so one edition's typing never shows in another.
          key={openEdition.storyId}
          edition={openEdition}
          isChanging={isChanging}
          onChange={onChange}
          onClose={() => setOpenPart('none')}
        />
      )}
    </section>
  );
}
