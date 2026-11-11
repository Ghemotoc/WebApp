/**
 * BuilderBlocks: the page builder's five blocks as visitors see them (story S1-E11-34; bundle
 * CMS-2b): picture and text, cards, steps, a quote and a call to action.
 *
 * Every block is real HTML with an h2, like the other blocks (one heading order). Long text is the
 * CMS's safe Markdown subset (CmsMarkdown); card and step words are plain text. A call to action
 * links only to one of our pages or an https address, which the database checks before publishing.
 * Who shows it: LandingBlockView. What it calls: CmsMarkdown, LandingPicture and buttonClassName.
 */
import { buttonClassName } from '@/components/ui/buttonStyles';
import { CmsMarkdown } from '@/features/website/components/CmsMarkdown';
import type { LandingBlock, LandingLanguage } from '@/schemas/landingPages';
import { safeLandingLink } from '@/schemas/landingPages';

import type { LandingExtras } from '../api/landingPages';
import { wordsOf } from '../lib/blocks';
import { entriesOf } from '../lib/entries';

import { LandingPicture } from './LandingPicture';

/** What a builder block needs. */
interface BuilderBlockProps {
  block: LandingBlock;
  language: LandingLanguage;
  extras: LandingExtras;
  isPreview?: boolean;
}

/**
 * A block's heading, the h2 every block but the hero uses.
 *
 * @returns the heading
 */
function BlockHeading({ block, language }: BuilderBlockProps) {
  return (
    <h2 className="m-0 font-heading text-[26px] font-bold text-heading">
      {wordsOf(block, language, 'heading')}
    </h2>
  );
}

/**
 * Picture and text: the picture beside the words on a wide screen, above them on a phone.
 *
 * @returns the section
 */
function PictureText(props: BuilderBlockProps) {
  const { block, language } = props;
  return (
    <section className="grid items-center gap-5 md:grid-cols-2">
      <LandingPicture
        block={block}
        language={language}
        pictures={props.extras.pictures}
        isPreview={props.isPreview}
      />
      <div className="flex min-w-0 flex-col gap-3">
        <BlockHeading {...props} />
        <CmsMarkdown markdown={wordsOf(block, language, 'body')} language={language} />
      </div>
    </section>
  );
}

/**
 * Cards in a row (one column on a phone), or numbered steps in order.
 *
 * @returns the section
 */
function Entries(props: BuilderBlockProps) {
  const { block, language } = props;
  const entries = entriesOf(block, language);
  // Steps have an order, so they are a numbered list; cards sit side by side.
  const isSteps = block.kind === 'steps';
  const ListTag = isSteps ? 'ol' : 'ul';
  return (
    <section className="flex flex-col gap-4">
      <BlockHeading {...props} />
      <ListTag
        className={
          isSteps
            ? 'm-0 flex list-none flex-col gap-3 p-0'
            : 'm-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]'
        }
      >
        {entries.map((entry, position) => (
          <li
            key={`${String(position)}-${entry.title}`}
            className="flex min-w-0 gap-3 rounded-card border border-border bg-surface p-5 shadow-card"
          >
            {isSteps && (
              <span
                aria-hidden="true"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-on-primary"
              >
                {position + 1}
              </span>
            )}
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="m-0 text-lg font-semibold text-ink [overflow-wrap:anywhere]">
                {entry.title}
              </h3>
              <p className="m-0 text-body [overflow-wrap:anywhere]">{entry.body}</p>
            </div>
          </li>
        ))}
      </ListTag>
    </section>
  );
}

/**
 * A quote and, when given, who said it.
 *
 * @returns the figure
 */
function Quote({ block, language }: BuilderBlockProps) {
  const source = wordsOf(block, language, 'source');
  return (
    <figure className="m-0 flex flex-col gap-2 border-l-4 border-primary py-2 pl-5">
      <blockquote className="m-0 font-heading text-[22px] leading-snug text-heading">
        <p className="m-0 [overflow-wrap:anywhere]">{wordsOf(block, language, 'quote')}</p>
      </blockquote>
      {source !== '' && <figcaption className="text-meta">{source}</figcaption>}
    </figure>
  );
}

/**
 * A call to action: a heading, a line of words and one button-styled link.
 *
 * @returns the section
 */
function CallToAction(props: BuilderBlockProps) {
  const { block, language } = props;
  const body = wordsOf(block, language, 'body');
  return (
    <section className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-6 shadow-card">
      <BlockHeading {...props} />
      {body !== '' && <p className="m-0 text-body">{body}</p>}
      <a href={safeLandingLink(block.link)} className={buttonClassName({ variant: 'primary' })}>
        {wordsOf(block, language, 'button_label')}
      </a>
    </section>
  );
}

/**
 * Renders one of the page builder's blocks by its kind.
 *
 * @returns the block
 */
export function BuilderBlockView(props: BuilderBlockProps) {
  if (props.block.kind === 'picture_text') return <PictureText {...props} />;
  if (props.block.kind === 'quote') return <Quote {...props} />;
  if (props.block.kind === 'call_to_action') return <CallToAction {...props} />;
  return <Entries {...props} />;
}
