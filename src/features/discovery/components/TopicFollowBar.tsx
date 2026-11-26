/**
 * TopicFollowBar: under a genre or tag page's title, the Follow button and a line of "#tag" links
 * (BOOKS-A06 and BOOKS-A09, user stories 1.6 and 1.9).
 *
 * Board A06 (a genre): "Follow Fantasy", then the genre's most used tags as underlined links.
 * Board A09 (a tag): "Follow this tag", then "Related" and the tags that sit on the same stories.
 * The links open each tag's page. The line is left out when there are no tags (or they couldn't
 * be read: it is extra, the list works without it).
 * Who uses it: StoryListHeader. What it calls: FollowButton (useFollow → set_topic_follow()) and
 * useTopicTags → topic_tags().
 */
import { Link } from 'react-router';

import { FollowButton } from '@/features/people/components/FollowButton';

import { useTopicTags } from '../hooks/useTopicTags';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/** What the bar needs. */
export interface TopicFollowBarProps {
  /** 'category' on a genre page, 'tag' on a tag page. */
  topicKind: 'category' | 'tag';
  /** The genre's slug or the tag's name, from the address. */
  topicKey: string;
  /** The page's title ("Fiction", "#mystery"), for the button and the undo note. */
  title: string;
}

/**
 * The line of tag links, with "Related" before it on a tag page.
 *
 * @returns the line, or null when there are no tags
 */
function TagLinks({ topicKind, topicKey }: Omit<TopicFollowBarProps, 'title'>) {
  const { t } = useDiscoveryTranslation();
  const { tags } = useTopicTags(topicKind, topicKey);
  if (tags.length === 0) return null;
  const listName = topicKind === 'tag' ? t('topicTags.related') : t('topicTags.top');
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      {/* Board A09 says "Related" before the links; on a genre page it stays for screen readers. */}
      <span className={topicKind === 'tag' ? 'type-meta text-ink-muted' : 'sr-only'}>
        {listName}
      </span>
      <ul aria-label={listName} className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
        {tags.map((tag) => (
          <li key={tag}>
            <Link
              to={`/discover/t/${encodeURIComponent(tag)}`}
              className="inline-flex min-h-6 items-center type-body font-semibold break-words text-ink-heading underline underline-offset-2"
            >
              {`#${tag}`}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Renders the Follow button and the tag links.
 *
 * @returns the bar
 */
export function TopicFollowBar({ topicKind, topicKey, title }: TopicFollowBarProps) {
  const target =
    topicKind === 'category'
      ? ({ kind: 'genre', slug: topicKey } as const)
      : ({ kind: 'tag', name: topicKey } as const);
  return (
    <div className="flex flex-col items-start gap-4">
      {title !== '' && <FollowButton target={target} targetLabel={title} />}
      <TagLinks topicKind={topicKind} topicKey={topicKey} />
    </div>
  );
}
