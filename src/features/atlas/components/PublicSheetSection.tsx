/**
 * PublicSheetSection: one part of a character's sheet that the writer opened to readers (user
 * stories bundle 6, story 6.18, board E37).
 *
 * Basics is a grid of short facts (label over value, four across on wide screens), with the
 * writer's own opened fields and the first appearance after them. A part of longer text (Look and
 * voice, Inside, In the story) reads as paragraphs: one field alone is just its words, as the
 * board draws it; two or more each get their label above. Pronouns sit in the page's head, so
 * Basics leaves them out. Who uses it: PublicCharacter. What it calls: sheetGroups.
 */
import type { ReactNode } from 'react';

import { sheetGroups, type SheetGroup, type StoryCharacter } from '../api/characters';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** One label and its value, already worded. */
export interface SheetFact {
  key: string;
  label: string;
  value: ReactNode;
}

/** What the section needs. */
export interface PublicSheetSectionProps {
  group: SheetGroup;
  character: StoryCharacter;
  /** Facts added after the sheet's own (Basics only: the writer's fields, first appearance). */
  extraFacts?: SheetFact[];
}

/** The group's fields with words in them, in the sheet's order, as facts. */
function useGroupFacts(group: SheetGroup, character: StoryCharacter): SheetFact[] {
  const { t } = useAtlasTranslation();
  // The head already shows the pronouns, so Basics doesn't repeat them (board E37).
  const keys = sheetGroups[group].filter((key) => key !== 'pronouns');
  return keys
    .filter((key) => (character.sheet[key] ?? '').trim() !== '')
    .map((key) => ({
      key,
      label: t(`characters.fields.${key}`),
      value: character.sheet[key],
    }));
}

/** One fact: its label over its value; in the Basics grid, with a hairline above (board E37). */
function FactItem({ fact, isRuled = false }: { fact: SheetFact; isRuled?: boolean }) {
  const ruleClasses = isRuled ? 'border-t border-hairline py-3' : '';
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${ruleClasses}`}>
      <dt className="type-meta text-ink-muted">{fact.label}</dt>
      <dd className="m-0 type-body wrap-anywhere whitespace-pre-line text-ink-heading">
        {fact.value}
      </dd>
    </div>
  );
}

/** Basics: short facts in a grid, label over value. */
function FactGrid({ facts }: { facts: SheetFact[] }) {
  return (
    <dl className="m-0 grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
      {facts.map((fact) => (
        <FactItem key={fact.key} fact={fact} isRuled />
      ))}
    </dl>
  );
}

/** A part of longer text: paragraphs, labelled only when there is more than one. */
function FactParagraphs({ facts }: { facts: SheetFact[] }) {
  const [onlyFact] = facts;
  if (facts.length === 1 && onlyFact !== undefined) {
    return (
      <p className="m-0 type-body wrap-anywhere whitespace-pre-line text-ink">{onlyFact.value}</p>
    );
  }
  return (
    <dl className="m-0 flex flex-col gap-4">
      {facts.map((fact) => (
        <FactItem key={fact.key} fact={fact} />
      ))}
    </dl>
  );
}

/**
 * Renders one opened part of the sheet.
 *
 * @returns the part's heading and its facts, or nothing when the part holds no words
 */
export function PublicSheetSection({ group, character, extraFacts = [] }: PublicSheetSectionProps) {
  const { t } = useAtlasTranslation();
  const facts = [...useGroupFacts(group, character), ...extraFacts];
  // A part the writer left closed reaches the page empty, so it shows nothing at all.
  if (facts.length === 0) return null;
  const headingId = `atlas-public-sheet-${group}`;
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-4">
      <h3 id={headingId} className="m-0 font-heading type-subheading font-bold text-ink-heading">
        {t(`characters.groups.${group}`)}
      </h3>
      {group === 'basics' ? <FactGrid facts={facts} /> : <FactParagraphs facts={facts} />}
    </section>
  );
}
