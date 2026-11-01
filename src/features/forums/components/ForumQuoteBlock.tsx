/**
 * ForumQuoteBlock: one quoted post inside a reply, or inside the reply box before posting
 * (bundle FORUMS-1, part c; story S1-E8-03; board 5.2 Forum thread).
 *
 * Board values: a 16 px-cornered panel (#F4F0EC, the panel token) with 12 by 16 px padding, 15 px
 * text in the body colour, opening with "inkwolf wrote in #1:" where "#1" links back to the
 * quoted post (criterion 1). The words are drawn from the quoted post as it is now, with the same
 * safe formatting as any post; when they are gone the block says why instead ("This post was
 * deleted.", "Removed by the moderation team.", "This post isn’t available."), so removed words
 * never live on inside a quote.
 * Who uses it: ForumPostCard (a posted reply's quotes) and ReplyForm (the quotes about to be sent).
 * What it calls: ForumPostText for the words.
 */
import { Link } from 'react-router';

import type { ForumQuote } from '../api/forumThreads';
import { nameOf } from '../lib/forumPeople';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ForumPostText } from './ForumPostText';

/** What one quote needs. */
export interface ForumQuoteBlockProps {
  quote: ForumQuote;
  /** The quoted post's permalink. */
  postAddress: string;
}

/**
 * The words, or the marker in their place.
 *
 * @returns the quote's body
 */
function QuoteWords({ quote }: { quote: ForumQuote }) {
  const { t } = useForumsTranslation();
  if (quote.state === 'live') return <ForumPostText text={quote.body ?? ''} />;
  return <p className="m-0 italic">{t(`quote.${quote.state}`)}</p>;
}

/**
 * Renders the quote.
 *
 * @returns a <blockquote> with its source line and words
 */
export function ForumQuoteBlock({ quote, postAddress }: ForumQuoteBlockProps) {
  const { t } = useForumsTranslation();
  const isLive = quote.state === 'live';
  const name = isLive ? nameOf(quote.author, t('person.deleted')) : null;
  const link = (
    <Link to={postAddress} className="font-semibold text-link underline">
      {t('post.permalink', { number: quote.number })}
    </Link>
  );
  return (
    <blockquote className="m-0 flex flex-col gap-1.5 rounded-2xl bg-panel px-4 py-3 text-[15px] leading-normal text-body">
      <p className="m-0 text-sm font-semibold text-ink">
        {name === null ? (
          <>
            {t('quote.fromPost')} {link}:
          </>
        ) : (
          <>
            {t('quote.wrote', { name })} {link}:
          </>
        )}
      </p>
      <QuoteWords quote={quote} />
    </blockquote>
  );
}
