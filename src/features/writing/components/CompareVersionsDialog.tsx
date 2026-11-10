/**
 * CompareVersionsDialog: "Compare versions" after a save conflict (story S1-E3-02b; board 4.3,
 * the conflict state).
 *
 * What it shows: the two versions side by side (stacked on phones), this device's on the left
 * and the other device's (the one the server has) on the right, each with its title, its words
 * and when it was saved, and a "Keep this one" button under each. Choosing one closes the
 * dialog; the screen then saves this device's text over the other, or loads the other one.
 * It is a native <dialog>: focus stays inside, Escape closes it and nothing is chosen.
 * Who uses it: ChapterEditorPage. What it calls: api/chapters.ts → the writer's own chapter row,
 * read fresh when the dialog opens.
 */
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { dateLocaleFor } from '@/lib/romania-time';

import { fetchMyChapter, type MyChapter } from '../api/chapters';
import { markdownToPlainText } from '../lib/chapterMarkdown';
import { useEditorTranslation } from '../registerEditorTranslations';

/** One side of the comparison. */
export interface VersionSide {
  title: string;
  text: string;
  /** When it was saved; null for this device's unsaved text. */
  savedAt: string | null;
}

/** What the dialog needs. */
export interface CompareVersionsDialogProps {
  isOpen: boolean;
  chapterCode: string;
  /** This device's title and words, read when the dialog opens. */
  thisDevice: VersionSide;
  onKeepThisDevice: () => void;
  onKeepOther: (other: MyChapter) => void;
  onClose: () => void;
}

/** One column: a heading, the saved time, the title, the words and the button. */
function VersionColumn(props: {
  heading: string;
  side: VersionSide;
  onKeep: () => void;
  headingId: string;
}) {
  const { t, i18n } = useEditorTranslation();
  const savedLine =
    props.side.savedAt === null
      ? t('compare.unsaved')
      : t('compare.savedAt', {
          time: new Intl.DateTimeFormat(dateLocaleFor(i18n.language), {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(props.side.savedAt)),
        });
  return (
    <section aria-labelledby={props.headingId} className="flex min-w-0 flex-1 flex-col gap-3">
      <h3 id={props.headingId} className="m-0 font-heading text-lg font-bold text-heading">
        {props.heading}
      </h3>
      <p className="m-0 text-[13px] text-meta">{savedLine}</p>
      <div className="max-h-[50vh] overflow-y-auto rounded-card border border-border bg-panel p-4">
        <p className="m-0 font-heading text-base font-bold text-heading">{props.side.title}</p>
        <p className="m-0 mt-2 text-[15px] leading-relaxed whitespace-pre-wrap text-ink">
          {props.side.text}
        </p>
      </div>
      <Button onClick={props.onKeep} className="self-start">
        {t('compare.keepThis')}
      </Button>
    </section>
  );
}

/**
 * Reads the other device's version, fresh each time the dialog opens (never from the cache).
 *
 * @returns other (null while loading), and failed
 */
function useOtherVersion(isOpen: boolean, chapterCode: string) {
  const { userId } = useSession();
  const query = useQuery<MyChapter | null>({
    queryKey: ['compare-chapter', userId, chapterCode],
    enabled: isOpen,
    queryFn: async () => fetchMyChapter(await requireClient(), chapterCode),
    staleTime: 0,
    gcTime: 0,
  });
  // While a fresh read is under way, the old answer isn't shown: it may be out of date.
  return { other: query.isFetching ? null : (query.data ?? null), failed: query.isError };
}

/**
 * Renders the dialog.
 *
 * @returns the dialog element (closed when isOpen is false)
 */
export function CompareVersionsDialog(props: CompareVersionsDialogProps) {
  const { t } = useEditorTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { other, failed } = useOtherVersion(props.isOpen, props.chapterCode);

  // Open and close the native dialog as the prop changes.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (props.isOpen && !dialog.open) dialog.showModal();
    if (!props.isOpen && dialog.open) dialog.close();
  }, [props.isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="compare-heading"
      onClose={props.onClose}
      className="m-auto w-[min(94vw,960px)] rounded-card border border-border bg-surface p-6 text-ink shadow-card backdrop:bg-ink/40"
    >
      <div className="flex flex-col gap-5">
        <h2 id="compare-heading" className="m-0 font-heading text-[24px] font-bold text-heading">
          {t('compare.heading')}
        </h2>
        <p className="m-0 text-sm text-body">{t('compare.intro')}</p>
        {failed && <Notice tone="error">{t('compare.loadFailed')}</Notice>}
        {!failed && other === null && (
          <p className="m-0 text-sm text-meta">{t('compare.loading')}</p>
        )}
        {other !== null && (
          <div className="flex flex-col gap-6 md:flex-row">
            <VersionColumn
              heading={t('compare.thisDevice')}
              headingId="compare-this"
              side={props.thisDevice}
              onKeep={props.onKeepThisDevice}
            />
            <VersionColumn
              heading={t('compare.otherDevice')}
              headingId="compare-other"
              side={{
                title: other.draftTitle,
                text: markdownToPlainText(other.draftBody),
                savedAt: other.draftSavedAt,
              }}
              onKeep={() => props.onKeepOther(other)}
            />
          </div>
        )}
        <Button variant="secondary" onClick={props.onClose} className="self-start">
          {t('compare.cancel')}
        </Button>
      </div>
    </dialog>
  );
}
