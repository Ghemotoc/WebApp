/**
 * StoryLanguageNote, TranslationCredit and AboutEditionCard: the words a story page adds when
 * the story exists in several languages (bundle TRANSLATE-1b; board TrStory; Robert, 16 Nov 2026).
 *
 * - TranslationCredit: "Translated from Romanian by Ana Vlad", under the author of a translated
 *   classic. A member's story never has one, because only its writer translates it.
 * - StoryLanguageNote: "Shown in English because this page is in English. Also in Română, the
 *   original. Your choice is remembered for this story."
 * - AboutEditionCard: the side card "About this edition" (original language, this edition, the
 *   translator, a classic's rights, also in) with "One story, counted once" under it.
 * Robert's rule (16 Nov 2026, 12:23 UTC): the note and the card show only when the story has
 * more than one language. A story in one language names its language only in "Labels from the
 * writer" (StorySideColumn).
 * Who uses them: StoryHeader and StorySideColumn.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { LabelRows } from '@/components/ui/LabelRows';
import { languageNameIn, languageOwnName } from '@/lib/language-names';

import type { EditionFacts, StoryEdition, TranslationRights } from '../api/editions';
import type { StoryPageData } from '../api/storyPage';
import { useEditionsTranslation } from '../registerEditionsTranslations';

/**
 * "Translated from <language> by <name>" for a translated classic.
 *
 * @returns the line, or nothing for an original or a story with no translator
 */
export function TranslationCredit({ story }: { story: StoryPageData }) {
  // This one line lives in reading.json, because the reader's header shows it too.
  const { t, i18n } = useTranslation('reading');
  const facts = story.edition;
  if (facts === null || facts.isOriginal || facts.translatorName === null) return null;
  return (
    <p className="m-0 type-body break-words text-ink-muted">
      {t('editions.translatedFromBy', {
        language: languageNameIn(facts.originalLanguage, i18n.language),
        name: facts.translatorName,
      })}
    </p>
  );
}

/**
 * The other languages as words: "Română, the original" or "English".
 *
 * @param others - every edition but the one on screen
 * @param originalWords - turns a language's name into "<name>, the original"
 * @returns the list, joined the way the interface language joins lists
 */
function otherLanguagesText(
  others: StoryEdition[],
  interfaceLanguage: string,
  originalWords: (language: string) => string,
): string {
  const names = others.map((edition) => {
    const name = languageOwnName(edition.languageCode);
    return edition.isOriginal ? originalWords(name) : name;
  });
  return new Intl.ListFormat(interfaceLanguage, { style: 'long', type: 'conjunction' }).format(
    names,
  );
}

/**
 * The note under the blurb saying which language is shown and why.
 *
 * @returns the note, or nothing for a story in one language
 */
export function StoryLanguageNote({ story }: { story: StoryPageData }) {
  const { t, i18n } = useEditionsTranslation();
  if (story.editions.length < 2) return null;
  const others = story.editions.filter((edition) => !edition.isCurrent);
  const values = {
    language: languageNameIn(story.languageCode, i18n.language),
    others: otherLanguagesText(others, i18n.language, (language) => t('theOriginal', { language })),
  };
  // "because this page is in English" is true only when the page and the edition agree.
  const matchesPage = i18n.language.slice(0, 2) === story.languageCode.slice(0, 2);
  return (
    <p className="m-0 flex max-w-[640px] items-start gap-3 rounded-card bg-tint px-4 py-3 type-body text-ink-muted">
      <ActionIcon name="info" size={16} className="mt-1 flex-none" />
      <span>{t(matchesPage ? 'shownForPage' : 'shown', values)}</span>
    </p>
  );
}

/** "Also in": each other language as a link to that edition. */
function AlsoInLinks({ others }: { others: StoryEdition[] }) {
  const { t } = useEditionsTranslation();
  return (
    <span className="flex flex-col items-start gap-1">
      {others.map((edition) => (
        <Link
          key={edition.slug}
          to={`/s/${edition.slug}`}
          lang={edition.languageCode}
          className="inline-flex min-h-6 items-center font-semibold text-link underline hover:text-link-hover"
        >
          {edition.isOriginal
            ? t('alsoInOriginal', { language: languageOwnName(edition.languageCode) })
            : languageOwnName(edition.languageCode)}
        </Link>
      ))}
    </span>
  );
}

/**
 * The words of the "Rights" row of a classic (TRANSLATE-1d; board TrStory): the original is in
 * the public domain; a translation says what staff recorded for it ("A translation has its own
 * copyright"). A member's story has no such row: its writer keeps the rights.
 *
 * @param facts - the edition facts of the story on screen
 * @returns the key under "about.rightsValues" in the editions texts, or null for no row
 */
function rightsKey(facts: EditionFacts): TranslationRights | null {
  if (!facts.isClassic) return null;
  return facts.isOriginal ? 'public_domain' : facts.translationRights;
}

/**
 * The side card "About this edition", with "One story, counted once" under it.
 *
 * @returns the card, or nothing for a story in one language
 */
export function AboutEditionCard({ story }: { story: StoryPageData }) {
  const { t } = useEditionsTranslation();
  const facts = story.edition;
  if (story.editions.length < 2 || facts === null) return null;
  const others = story.editions.filter((edition) => !edition.isCurrent);
  const translatorRows =
    facts.translatorName === null || facts.isOriginal
      ? []
      : [{ label: t('about.translator'), value: facts.translatorName }];
  const rights = rightsKey(facts);
  const rightsRows =
    rights === null ? [] : [{ label: t('about.rights'), value: t(`about.rightsValues.${rights}`) }];
  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card">
      <h2 className="m-0 eyebrow">{t('about.heading')}</h2>
      <LabelRows
        rows={[
          {
            label: t('about.originalLanguage'),
            value: (
              <span lang={facts.originalLanguage}>{languageOwnName(facts.originalLanguage)}</span>
            ),
          },
          {
            label: t('about.thisEdition'),
            value: <span lang={story.languageCode}>{languageOwnName(story.languageCode)}</span>,
          },
          ...translatorRows,
          ...rightsRows,
          { label: t('about.alsoIn'), value: <AlsoInLinks others={others} /> },
        ]}
      />
      <p className="m-0 type-meta leading-normal text-ink-muted">
        <strong className="font-semibold text-ink-heading">{t('countedOnceTitle')}</strong>{' '}
        {t('countedOnceBody')}
      </p>
    </div>
  );
}
