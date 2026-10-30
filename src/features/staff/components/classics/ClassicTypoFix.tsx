/**
 * ClassicTypoFix: "Fix a typo" on a published classic (story S1-E11-16 AC 4, part 16b): staff pick
 * a live chapter, correct a typo from the source edition in its text and give a reason. The fix
 * goes live at once; the earlier text stays as a version and the reason goes to the audit log.
 *
 * Who shows it: ClassicCard, once the work has been published. What it calls: useClassicTypoFix →
 * admin_classic_chapter() and admin_fix_classic_typo(), which refuses anything bigger than a typo
 * (staff never rewrite or abridge a work). Plain components, no doodles (staff screens).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';

import type { ClassicWork, ClassicsFailure } from '../../api/classics';
import type { LiveClassicChapter } from '../../api/classicsImport';
import { useClassicTypoFix } from '../../hooks/useClassicTypoFix';

/**
 * The fix's result: what went wrong, or that it is live.
 *
 * @returns the notice, or nothing
 */
function FixNotice({ failure, isFixed }: { failure: ClassicsFailure | null; isFixed: boolean }) {
  const { t } = useTranslation('staff');
  if (failure !== null) return <Notice tone="error">{t(`classics.failures.${failure}`)}</Notice>;
  if (isFixed) return <Notice tone="success">{t('classics.typo.done')}</Notice>;
  return null;
}

/**
 * The text box and reason for one chapter. It starts from the text readers see now.
 *
 * @returns the form
 */
function TypoForm({
  chapter,
  fixing,
}: {
  chapter: LiveClassicChapter;
  fixing: ReturnType<typeof useClassicTypoFix>;
}) {
  const { t } = useTranslation('staff');
  const [body, setBody] = useState(chapter.body);
  const [reason, setReason] = useState('');
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm text-meta">{t('classics.typo.fixes', { count: chapter.fixes })}</p>
      <Textarea
        id={`classic-typo-body-${chapter.code}`}
        label={t('classics.typo.text', { title: chapter.title })}
        hint={t('classics.typo.textHint')}
        rows={10}
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          fixing.resetFix();
        }}
      />
      <TextInput
        id={`classic-typo-reason-${chapter.code}`}
        label={t('classics.typo.reason')}
        hint={t('classics.typo.reasonHint')}
        value={reason}
        maxLength={300}
        onChange={(event) => setReason(event.target.value)}
      />
      <div>
        <Button disabled={fixing.isFixing} onClick={() => fixing.fix(body, reason)}>
          {t('classics.typo.save')}
        </Button>
      </div>
      <FixNotice failure={fixing.fixFailure} isFixed={fixing.isFixed} />
    </div>
  );
}

/**
 * Renders the chapter picker and, once a chapter loads, its form.
 *
 * @param props.work - the published classic
 * @returns the typo fix panel
 */
export function ClassicTypoFix({ work }: { work: ClassicWork }) {
  const { t } = useTranslation('staff');
  const liveChapters = work.chapters.filter((chapter) => chapter.status === 'published');
  const [chapterCode, setChapterCode] = useState(liveChapters[0]?.code ?? '');
  const fixing = useClassicTypoFix(chapterCode === '' ? null : chapterCode);
  if (liveChapters.length === 0) return null;
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <Select
        id={`classic-typo-chapter-${work.storyId}`}
        label={t('classics.typo.chapter')}
        placement="form"
        options={liveChapters.map((chapter, index) => ({
          value: chapter.code,
          label: t('classics.typo.chapterOption', { number: index + 1, title: chapter.title }),
        }))}
        value={chapterCode}
        onChange={setChapterCode}
      />
      {fixing.loadFailure !== null && (
        <Notice tone="error">{t(`classics.failures.${fixing.loadFailure}`)}</Notice>
      )}
      {fixing.chapter !== null && (
        <TypoForm key={fixing.chapter.code} chapter={fixing.chapter} fixing={fixing} />
      )}
    </div>
  );
}
