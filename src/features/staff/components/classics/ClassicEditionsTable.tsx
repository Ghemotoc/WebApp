/**
 * ClassicEditionsTable: the languages of one classic on /staff/classics (bundle TRANSLATE-1d;
 * board TrStaff; Robert, 16 Nov 2026).
 *
 * What it shows, per language: its own name (with "Original" on the text in the work's original
 * language), the title in that language, the translator, the translation rights, how many of the
 * classic's chapters are published in it, and Published or Draft. Each later edition has an
 * "Edit" button that opens it under the table; the first edition is edited on its own card.
 * It is a real table from 1280 px (the card is at most 860 px wide, so seven columns need the room); below that each language is a small block with the same facts
 * under their labels, so nothing scrolls sideways (CLAUDE.md rule 21).
 *
 * Who shows it: ClassicEditionsPanel. What it calls: onEdit(storyId). Plain rows with a 1 px line
 * between them (DoD design rules); no doodles (staff screens).
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';
import { languageOwnName } from '@/lib/language-names';

import type { ClassicWork } from '../../api/classics';

/** What the table needs. */
export interface ClassicEditionsTableProps {
  /** The classic's first edition. */
  work: ClassicWork;
  /** Its later editions. */
  editions: ClassicWork[];
  onEdit: (storyId: string) => void;
}

/** How many of a work's chapters are live. */
function publishedCount(work: ClassicWork): number {
  return work.chapters.filter((chapter) => chapter.status === 'published').length;
}

/** A cell: a table cell from 768 px, a labelled line on a phone. */
function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <td className="px-3 py-1 align-middle text-sm text-body max-xl:block max-xl:px-0 xl:py-3">
      <span className="mr-2 text-[13px] font-semibold text-meta xl:hidden">{label}</span>
      {children}
    </td>
  );
}

/**
 * Why this text may be shown: the original is free by its author's death; a translation by the
 * ground staff chose, or "Not checked" until they choose.
 *
 * @returns the words for the "Translation rights" cell
 */
function RightsText({ edition }: { edition: ClassicWork }) {
  const { t } = useTranslation('staff');
  if (edition.languageCode === edition.originalLanguage) {
    return t('classics.editions.rightsOriginal', { year: edition.authorDiedYear });
  }
  if (edition.translationRights === '') return t('classics.editions.notChecked');
  return t(`classics.editions.rightsValues.${edition.translationRights}`);
}

/** The translator's name, or a dash that screen readers hear as "No translator". */
function TranslatorText({ name }: { name: string }) {
  const { t } = useTranslation('staff');
  if (name !== '') return name;
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr-only">{t('classics.editions.noTranslator')}</span>
    </>
  );
}

/**
 * One language's row.
 *
 * @param props.edition - the text in this language
 * @param props.chaptersInClassic - how many chapters the first edition has
 * @param props.onEdit - opens the edition; absent on the first edition's row
 * @returns the row
 */
function EditionRow({
  edition,
  chaptersInClassic,
  onEdit,
}: {
  edition: ClassicWork;
  chaptersInClassic: number;
  onEdit?: () => void;
}) {
  const { t } = useTranslation('staff');
  const live = publishedCount(edition);
  const name = languageOwnName(edition.languageCode);
  return (
    <tr className="border-t border-border max-xl:flex max-xl:flex-col max-xl:gap-0.5 max-xl:py-3">
      <th
        scope="row"
        className="px-3 py-1 text-left align-middle text-sm font-bold text-heading max-xl:px-0 xl:py-3"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span lang={edition.languageCode}>{name}</span>
          {edition.languageCode === edition.originalLanguage && (
            <InfoPill tone="neutral">{t('classics.editions.original')}</InfoPill>
          )}
        </span>
      </th>
      <Cell label={t('classics.editions.columns.title')}>
        <span lang={edition.languageCode} className="break-words">
          {edition.title}
        </span>
      </Cell>
      <Cell label={t('classics.editions.columns.translator')}>
        <TranslatorText name={edition.translatorName} />
      </Cell>
      <Cell label={t('classics.editions.columns.rights')}>
        <RightsText edition={edition} />
      </Cell>
      <Cell label={t('classics.editions.columns.chapters')}>
        {t('classics.editions.chaptersOf', { count: live, total: chaptersInClassic })}
      </Cell>
      <Cell label={t('classics.editions.columns.status')}>
        <InfoPill tone={live > 0 ? 'sage' : 'gold'}>
          {t(live > 0 ? 'classics.card.live' : 'classics.card.draft')}
        </InfoPill>
      </Cell>
      <td className="px-3 py-1 align-middle max-xl:px-0 max-xl:pt-2 xl:py-3">
        {onEdit !== undefined && (
          <Button
            variant="secondary"
            aria-label={t('classics.editions.editLabel', { language: name })}
            onClick={onEdit}
          >
            {t('classics.editions.edit')}
          </Button>
        )}
      </td>
    </tr>
  );
}

/**
 * Renders the table: the first edition, then the later ones.
 *
 * @returns the table
 */
export function ClassicEditionsTable({ work, editions, onEdit }: ClassicEditionsTableProps) {
  const { t } = useTranslation('staff');
  const headings = ['language', 'title', 'translator', 'rights', 'chapters', 'status'] as const;
  return (
    <table className="w-full border-collapse max-xl:block">
      <caption className="sr-only">{t('classics.editions.caption', { title: work.title })}</caption>
      <thead className="max-xl:sr-only">
        <tr>
          {headings.map((heading) => (
            <th key={heading} scope="col" className="px-3 py-3 text-left eyebrow-type text-heading">
              {t(`classics.editions.columns.${heading}`)}
            </th>
          ))}
          <th scope="col" className="px-3 py-3">
            <span className="sr-only">{t('classics.editions.columns.actions')}</span>
          </th>
        </tr>
      </thead>
      <tbody className="max-xl:block [&>tr:first-child]:max-xl:border-t-0">
        <EditionRow edition={work} chaptersInClassic={work.chapters.length} />
        {editions.map((edition) => (
          <EditionRow
            key={edition.storyId}
            edition={edition}
            chaptersInClassic={work.chapters.length}
            onEdit={() => onEdit(edition.storyId)}
          />
        ))}
      </tbody>
    </table>
  );
}
