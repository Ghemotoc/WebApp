/**
 * LandingBlockView: one block of a landing page, as visitors see it (story S1-E11-14; bundle
 * CONTESTS-13a1).
 *
 * Every block is real HTML text with one heading level: the hero is the page's h1 and every other
 * block an h2 (criterion 4, one heading order). Long text is the CMS's safe Markdown subset
 * (CmsMarkdown: no raw HTML, links get rel="nofollow ugc noopener"). No countdowns and no "only
 * today": copy aimed at minors must not pressure them (story legal notes).
 * Part a2a: a Text block may carry a picture (LandingPicture), and Featured stories draws a
 * shelf of story cards (FeaturedStoriesBlock). Part a2b: Remind me (RemindMeBlock).
 * Who shows it: LandingPageView. What it calls: CmsMarkdown and the shared formatters.
 */
import { CmsMarkdown } from '@/features/website/components/CmsMarkdown';
import { formatRomaniaDate } from '@/lib/romania-time';
import type { LandingBlock, LandingLanguage } from '@/schemas/landingPages';

import type { LandingExtras } from '../api/landingPages';
import { wordsOf } from '../lib/blocks';
import { useLandingPageTranslation } from '../registerLandingPageTranslations';

import { FeaturedStoriesBlock } from './FeaturedStoriesBlock';
import { LandingPicture } from './LandingPicture';
import { RemindMeBlock } from './RemindMeBlock';

/** What a block needs: the block and the language the visitor reads. */
interface BlockProps {
  block: LandingBlock;
  language: LandingLanguage;
}

/** What the block view needs: also the page's pictures and story cards, and whether it is the
 * editor's preview. */
interface LandingBlockViewProps extends BlockProps {
  extras: LandingExtras;
  isPreview?: boolean;
}

/**
 * A block's heading and its Markdown text.
 *
 * @returns the section
 */
function TextSection({ block, language, extras, isPreview }: LandingBlockViewProps) {
  const body = wordsOf(block, language, 'body');
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 font-heading text-[26px] font-bold text-heading">
        {wordsOf(block, language, 'heading')}
      </h2>
      <LandingPicture
        block={block}
        language={language}
        pictures={extras.pictures}
        isPreview={isPreview}
      />
      {body !== '' && <CmsMarkdown markdown={body} language={language} />}
    </section>
  );
}

/**
 * The three key dates, in a list of labels and values.
 *
 * @returns the section
 */
function KeyDates({ block, language }: BlockProps) {
  const { t } = useLandingPageTranslation();
  const dates = block.dates ?? { entries_open: '', entries_close: '', results: '' };
  const note = wordsOf(block, language, 'note');
  const rows = [
    { label: t('dates.entriesOpen'), value: dates.entries_open },
    { label: t('dates.entriesClose'), value: dates.entries_close },
    { label: t('dates.results'), value: dates.results },
  ];
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 font-heading text-[26px] font-bold text-heading">
        {wordsOf(block, language, 'heading')}
      </h2>
      {/* Label and value rows with a fine line between them (definition of done, design rules). */}
      <dl className="m-0 flex flex-col">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-wrap justify-between gap-2 border-b border-hairline py-2"
          >
            <dt className="text-meta">{row.label}</dt>
            <dd className="m-0 font-semibold text-ink">
              {row.value === ''
                ? ''
                : formatRomaniaDate(new Date(`${row.value}T12:00:00Z`), language)}
            </dd>
          </div>
        ))}
      </dl>
      {note !== '' && <p className="m-0 text-body">{note}</p>}
    </section>
  );
}

/**
 * Who can enter: the age groups and the words.
 *
 * @returns the section
 */
function WhoCanEnter({ block, language }: BlockProps) {
  const { t } = useLandingPageTranslation();
  const groups = block.age_groups ?? [];
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 font-heading text-[26px] font-bold text-heading">
        {wordsOf(block, language, 'heading')}
      </h2>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label={t('ageGroupsLabel')}>
        {groups.map((group) => (
          <li
            key={group}
            className="inline-flex h-6 items-center rounded-full border border-(--pill-sage-border) bg-(--pill-sage-bg) px-3 text-sm leading-none text-(--pill-sage-text)"
          >
            {t(`ageGroups.${group}`)}
          </li>
        ))}
      </ul>
      <CmsMarkdown markdown={wordsOf(block, language, 'body')} language={language} />
    </section>
  );
}

/**
 * The rules: a short summary and the link to the full rules.
 *
 * @returns the section
 */
function Rules({ block, language }: BlockProps) {
  const body = wordsOf(block, language, 'body');
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 font-heading text-[26px] font-bold text-heading">
        {wordsOf(block, language, 'heading')}
      </h2>
      {body !== '' && <CmsMarkdown markdown={body} language={language} />}
      <a
        href={block.link ?? '#'}
        className="inline-flex min-h-11 w-fit items-center font-semibold text-link underline"
      >
        {wordsOf(block, language, 'link_label')}
      </a>
    </section>
  );
}

/**
 * Questions and answers, each question a disclosure.
 *
 * @returns the section
 */
function Questions({ block, language }: BlockProps) {
  const items = block[language].items ?? [];
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 font-heading text-[26px] font-bold text-heading">
        {wordsOf(block, language, 'heading')}
      </h2>
      <div className="flex flex-col">
        {items.map((item, position) => (
          <details
            key={`${String(position)}-${item.question}`}
            className="border-b border-hairline py-3"
          >
            <summary className="min-h-11 cursor-pointer font-semibold text-ink">
              {item.question}
            </summary>
            <div className="pt-2">
              <CmsMarkdown markdown={item.answer} language={language} />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

/**
 * Renders one block by its kind. The hero is drawn by LandingPageView, around the page title.
 *
 * @returns the block, or nothing for the hero
 */
export function LandingBlockView(props: LandingBlockViewProps) {
  const { block, language, extras } = props;
  if (block.kind === 'key_dates') return <KeyDates block={block} language={language} />;
  if (block.kind === 'who_can_enter') return <WhoCanEnter block={block} language={language} />;
  if (block.kind === 'rules') return <Rules block={block} language={language} />;
  if (block.kind === 'questions') return <Questions block={block} language={language} />;
  if (block.kind === 'hero') return null;
  if (block.kind === 'featured') {
    const stories = extras.featured === null ? null : (extras.featured[block.id] ?? []);
    return <FeaturedStoriesBlock block={block} language={language} stories={stories} />;
  }
  if (block.kind === 'remind_me') {
    return <RemindMeBlock block={block} language={language} reminder={extras.reminder} />;
  }
  // text, prize and how to enter are a heading and Markdown text (a text block's picture too).
  return <TextSection {...props} />;
}
