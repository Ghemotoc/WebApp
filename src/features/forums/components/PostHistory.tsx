/**
 * PostHistory: the earlier versions of an edited post, for moderators (bundle FORUMS-1, part b;
 * S1-E8-02 criterion 4: "moderators can see the previous version").
 *
 * Opens under the post with "Earlier versions"; each version shows when it was written and its
 * words, cleaned as any post is (ForumPostText); an earlier title shows as plain text. Only
 * moderation staff get the button, and the database refuses everyone else.
 * Who uses it: ForumPostCard. What it calls: usePostHistory → forum_post_history().
 */
import { useForumsTranslation } from '../registerForumsTranslations';
import { usePostHistory } from '../hooks/useForumWrites';
import { postTime } from '../lib/forumDates';

import { ForumPostText } from './ForumPostText';

/**
 * Renders the versions.
 *
 * @param props.postId - the post
 * @param props.id - the region's id, named by the button's aria-controls
 * @returns the list, a loading line or the failure
 */
export function PostHistory({ postId, id }: { postId: string; id: string }) {
  const { t, i18n } = useForumsTranslation();
  const history = usePostHistory(postId, true);
  return (
    <section id={id} className="flex flex-col gap-3 rounded-card border border-border bg-panel p-4">
      <p className="m-0 type-meta font-semibold text-ink-muted">{t('post.historyHeading')}</p>
      {history.loadFailed && (
        <p className="m-0 type-body text-destructive">{t('post.historyFailed')}</p>
      )}
      {history.versions !== null && (
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {history.versions.map((version) => (
            <li
              key={version.writtenAt}
              className="flex flex-col gap-2 border-t border-border pt-3 first:border-t-0 first:pt-0"
            >
              <p className="m-0 type-meta text-ink-muted">
                {t('post.historyWritten', { time: postTime(version.writtenAt, i18n.language) })}
              </p>
              {version.title !== null && (
                <p className="m-0 type-body font-semibold text-ink">
                  {t('post.historyTitle', { title: version.title })}
                </p>
              )}
              <ForumPostText text={version.body} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
