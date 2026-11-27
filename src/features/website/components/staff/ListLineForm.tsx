/**
 * ListLineForm: the form under "Lines under the title" on Staff › Website › Genre and tag pages,
 * where the owner and admins write the short line under a genre or tag page's title, in one
 * language (BOOKS-A06 and BOOKS-A09; boards A06-ReadGenre "Maps, magic and long journeys." and
 * A09-ReadTag).
 *
 * Pick the page (a genre, or "Another tag" and its name) and the language; the line already saved
 * there fills the box. Saving an empty box takes the line off. A language with no line shows the
 * English one, so English is first in the list.
 * Who shows it: ListLinesSection. What it calls: useStoryCategories (the genres),
 * useInterfaceLanguages and the onSave it is given.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';
import { useStoryCategories } from '@/features/writing/hooks/useStoryCategories';
import { languageNameIn } from '@/lib/language-names';

import {
  longestPageLine,
  type ListPageLine,
  type PageLinePlace,
} from '../../api/staff/listPageLines';
import { useInterfaceLanguages } from '../../hooks/useInterfaceLanguages';
import { pageNameFor } from '../../lib/listBackgrounds';

/** The Page drop-down's value for "Another tag": the tag's name comes from its own field. */
const anotherTag = 'tag:';

/** What the form needs. */
interface ListLineFormProps {
  /** Every saved line, to fill the box when a page and language are picked. */
  lines: readonly ListPageLine[];
  /** Where the form starts: a saved line's place after Edit, else the first genre in English. */
  start: PageLinePlace;
  isBusy: boolean;
  onSave: (place: PageLinePlace, line: string) => void;
}

/**
 * The line saved for a place, or '' when there is none.
 *
 * @param lines - every saved line
 * @param place - the page and language
 * @returns the saved sentence or ''
 */
function savedLineFor(lines: readonly ListPageLine[], place: PageLinePlace): string {
  const saved = lines.find(
    (row) =>
      row.kind === place.kind &&
      row.key.toLowerCase() === place.key.toLowerCase() &&
      row.language === place.language,
  );
  return saved?.line ?? '';
}

/**
 * The Page drop-down (every genre, then "Another tag" and its name) and the Language drop-down
 * (English first, each name in the staff member's language).
 *
 * @param props.place - the page and language the form is on
 * @param props.onMove - moves the form to another page or language
 * @returns the fields in one wrapping row
 */
function LinePlaceFields({
  place,
  onMove,
}: {
  place: PageLinePlace;
  onMove: (next: PageLinePlace) => void;
}) {
  const { t, i18n } = useTranslation('websiteAdmin');
  const { categories } = useStoryCategories();
  const languages = useInterfaceLanguages();
  // Step 1: the Page drop-down: every genre, then "Another tag".
  const pageOptions = [
    ...categories.map((category) => ({
      value: `category:${category.slug}`,
      label: pageNameFor({ kind: 'category', key: category.slug }, t),
    })),
    { value: anotherTag, label: t('listLines.anotherTag') },
  ];
  const pageValue = place.kind === 'category' ? `category:${place.key}` : anotherTag;
  /** The place a Page pick leads to: a genre, or an empty tag name to type. */
  const placeForPage = (picked: string): PageLinePlace =>
    picked === anotherTag
      ? { kind: 'tag', key: '', language: place.language }
      : { kind: 'category', key: picked.replace('category:', ''), language: place.language };
  // Step 2: the Language drop-down.
  const languageOptions = languages.map((code) => ({
    value: code,
    label: languageNameIn(code, i18n.language),
    lang: code,
  }));
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        id="list-line-page"
        label={t('listLines.page')}
        isLabelVisible
        placement="form"
        value={pageValue}
        options={pageOptions}
        onChange={(picked) => onMove(placeForPage(picked))}
      />
      {place.kind === 'tag' && (
        <TextInput
          id="list-line-tag"
          label={t('listLines.tagName')}
          value={place.key}
          maxLength={40}
          onChange={(event) => onMove({ ...place, key: event.target.value })}
        />
      )}
      <Select
        id="list-line-language"
        label={t('listLines.language')}
        isLabelVisible
        placement="form"
        value={place.language}
        options={languageOptions}
        onChange={(picked) => onMove({ ...place, language: picked })}
      />
    </div>
  );
}

/**
 * Renders the form.
 *
 * @returns the page, language and line fields with "Save line"
 */
export function ListLineForm({ lines, start, isBusy, onSave }: ListLineFormProps) {
  const { t } = useTranslation('websiteAdmin');
  const [place, setPlace] = useState<PageLinePlace>(start);
  const [line, setLine] = useState(() => savedLineFor(lines, start));

  /** Moves the form to another page or language and shows the line saved there. */
  const moveTo = (next: PageLinePlace) => {
    setPlace(next);
    setLine(savedLineFor(lines, next));
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        // A tag's name is saved without its # and spaces; the database finds it in any case.
        event.preventDefault();
        onSave({ ...place, key: place.key.trim().replace(/^#/, '') }, line);
      }}
    >
      <LinePlaceFields place={place} onMove={moveTo} />
      <Textarea
        id="list-line-text"
        label={t('listLines.line')}
        hint={t('listLines.lineHint', { count: longestPageLine })}
        value={line}
        maxLength={longestPageLine}
        rows={2}
        onChange={(event) => setLine(event.target.value)}
      />
      <Button type="submit" variant="primary" className="w-fit" disabled={isBusy}>
        {t('listLines.save')}
      </Button>
    </form>
  );
}
