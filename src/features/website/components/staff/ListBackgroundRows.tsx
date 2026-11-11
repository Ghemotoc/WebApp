/**
 * GenreBackgroundRows and TagBackgroundRows: the two lists on Staff › Website › Genre and tag
 * pages (bundle G12b; the StaffWebsite board's "Genre page backgrounds" and "Tag page
 * backgrounds").
 *
 * Each row names the page, its colour in the chosen market ("Sky", or "Default: Plum") and who set
 * it, with Edit. The tag list shows only tags with a band, and "Add a tag background" takes any
 * approved tag's name; the database refuses a name that isn't one.
 * Who shows them: ListBackgroundsTab. What they call: useStoryFormOptions (the genres).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { categoryAccent } from '@/features/discovery/lib/categoryAccents';
import { useStoryFormOptions } from '@/features/writing/hooks/useStoryFormOptions';

import type { ListBackground } from '../../api/staff/listPageBackgrounds';
import { pageNameFor } from '../../lib/listBackgrounds';

/** What each list needs. */
interface RowsProps {
  /** The choices saved for the market being edited. */
  backgrounds: readonly ListBackground[];
  onEdit: (key: string) => void;
}

/**
 * One page in a list.
 *
 * @returns a list item
 */
function BackgroundRow({
  name,
  colour,
  setBy,
  onEdit,
}: {
  name: string;
  colour: string;
  setBy: string | null;
  onEdit: () => void;
}) {
  const { t } = useTranslation('websiteAdmin');
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-b-0">
      <span className="flex min-w-0 flex-col">
        <b className="break-words text-heading">{name}</b>
        <span className="text-sm text-meta">
          {setBy === null ? colour : t('listBackgrounds.colourSetBy', { colour, handle: setBy })}
        </span>
      </span>
      <Button
        type="button"
        variant="secondary"
        aria-label={t('listBackgrounds.editLabel', { name })}
        onClick={onEdit}
      >
        {t('listBackgrounds.edit')}
      </Button>
    </li>
  );
}

/**
 * "Genre page backgrounds": every genre, with its chosen colour or its own accent.
 *
 * @returns the card
 */
export function GenreBackgroundRows({ backgrounds, onEdit }: RowsProps) {
  const { t } = useTranslation('websiteAdmin');
  const { categories } = useStoryFormOptions();
  return (
    <section
      aria-labelledby="genre-backgrounds-heading"
      className="flex flex-col gap-2 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="genre-backgrounds-heading"
        className="m-0 font-heading text-xl font-bold text-heading"
      >
        {t('listBackgrounds.genresHeading')}
      </h2>
      <ul className="m-0 list-none p-0">
        {categories.map((category) => {
          const chosen = backgrounds.find(
            (row) => row.kind === 'category' && row.key === category.slug,
          );
          const colour =
            chosen === undefined
              ? t('listBackgrounds.defaultColour', {
                  colour: t(`listBackgrounds.palettes.${categoryAccent(category.slug)}`),
                })
              : t(`listBackgrounds.palettes.${chosen.palette}`);
          return (
            <BackgroundRow
              key={category.slug}
              name={pageNameFor({ kind: 'category', key: category.slug }, t)}
              colour={colour}
              setBy={chosen?.setBy ?? null}
              onEdit={() => onEdit(category.slug)}
            />
          );
        })}
      </ul>
    </section>
  );
}

/**
 * "Tag page backgrounds": the tags with a band, and the way to add one.
 *
 * @returns the card
 */
export function TagBackgroundRows({ backgrounds, onEdit }: RowsProps) {
  const { t } = useTranslation('websiteAdmin');
  const [tagName, setTagName] = useState('');
  const tagRows = backgrounds.filter((row) => row.kind === 'tag');
  const typedTag = tagName.trim().replace(/^#/, '');
  return (
    <section
      aria-labelledby="tag-backgrounds-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2 id="tag-backgrounds-heading" className="m-0 font-heading text-xl font-bold text-heading">
        {t('listBackgrounds.tagsHeading')}
      </h2>
      <p className="m-0 text-sm text-body">{t('listBackgrounds.tagsNote')}</p>
      {tagRows.length > 0 && (
        <ul className="m-0 list-none p-0">
          {tagRows.map((row) => (
            <BackgroundRow
              key={row.key}
              name={pageNameFor(row, t)}
              colour={t(`listBackgrounds.palettes.${row.palette}`)}
              setBy={row.setBy}
              onEdit={() => onEdit(row.key)}
            />
          ))}
        </ul>
      )}
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (typedTag !== '') onEdit(typedTag);
        }}
      >
        <TextInput
          id="list-background-tag"
          label={t('listBackgrounds.tagName')}
          value={tagName}
          maxLength={40}
          onChange={(event) => setTagName(event.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={typedTag === ''}>
          {t('listBackgrounds.addTag')}
        </Button>
      </form>
    </section>
  );
}
