/**
 * ClassicsPage: /staff/classics, where an owner or admin adds public-domain classics, checks
 * where they are free and publishes them (story S1-E11-16, part 16a; canvas 8.16; Robert, 17 Oct
 * 2026 and 25 Oct 2026, 07:15).
 *
 * Who shows it: the router, inside StaffLayout (the "classics" area: owner and admin). The
 * database refuses everyone else (admin_list_classics()), and the page says so.
 * What it calls: useClassics → api/classics.ts; ClassicWorkForm for a new work and ClassicCard
 * for each one. A work is published under the official classics account with its real author
 * as the byline (S1-E5-06). Part 16b adds ClassicsImport (the research lists as drafts) and
 * ClassicSuggestionsPanel (who became free on 1 January); typo fixes sit on each published card.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { emptyClassicDetails, type ClassicDetails } from '../../api/classics';
import { useClassics } from '../../hooks/useClassics';

import type { NewAuthor } from './ClassicAuthorFields';
import { ClassicCard } from './ClassicCard';
import { ClassicsImport } from './ClassicsImport';
import { ClassicSuggestionsPanel } from './ClassicSuggestionsPanel';
import { ClassicWorkForm } from './ClassicWorkForm';

/** useClassics's result, passed down once. */
type Classics = ReturnType<typeof useClassics>;

/**
 * Saves a work's details, adding a new author first when one was typed.
 *
 * @param classics - useClassics's result
 * @returns the save function the forms call
 */
function saverFor(classics: Classics) {
  return async (storyId: string | null, details: ClassicDetails, newAuthor: NewAuthor | null) => {
    const authorId =
      newAuthor === null
        ? details.authorId
        : await classics.addAuthor(newAuthor.name, Number(newAuthor.diedYear));
    return classics.change({ kind: 'save', storyId, details: { ...details, authorId } });
  };
}

/**
 * The notices for the last change: what went wrong, or what was done.
 *
 * @returns the notice, or nothing
 */
function ChangeNotice({ classics }: { classics: Classics }) {
  const { t } = useTranslation('staff');
  const failure = classics.authorFailure ?? classics.changeFailure;
  if (failure !== null) return <Notice tone="error">{t(`classics.failures.${failure}`)}</Notice>;
  if (classics.lastChange !== null) {
    return <Notice tone="success">{t(`classics.done.${classics.lastChange}`)}</Notice>;
  }
  return null;
}

/**
 * The page's body: a refusal, an error, or the add button and the list.
 *
 * @returns the body
 */
function ClassicsBody({ classics }: { classics: Classics }) {
  const { t } = useTranslation('staff');
  const [isAdding, setIsAdding] = useState(false);
  const save = saverFor(classics);
  if (classics.loadFailure === 'not_allowed')
    return <p className="m-0 text-body">{t('classics.notAllowed')}</p>;
  if (classics.loadFailure !== null) {
    return <Notice tone="error">{t(`classics.failures.${classics.loadFailure}`)}</Notice>;
  }
  return (
    <>
      {isAdding ? (
        <ClassicWorkForm
          initial={emptyClassicDetails}
          authors={classics.authors}
          isSaving={classics.isChanging}
          onSave={async (details, newAuthor) => {
            await save(null, details, newAuthor);
            setIsAdding(false);
          }}
          onCancel={() => setIsAdding(false)}
        />
      ) : (
        <div>
          <Button onClick={() => setIsAdding(true)}>{t('classics.add')}</Button>
        </div>
      )}
      <ChangeNotice classics={classics} />
      <ClassicSuggestionsPanel />
      <ClassicsImport />
      {!classics.isLoading && classics.works.length === 0 && (
        <p className="m-0 text-body">{t('classics.empty')}</p>
      )}
      {classics.works.map((work) => (
        <ClassicCard
          key={work.storyId}
          work={work}
          authors={classics.authors}
          isChanging={classics.isChanging}
          onChange={classics.change}
          onSave={save}
        />
      ))}
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the Classics screen
 */
export function ClassicsPage() {
  const { t } = useTranslation('staff');
  const classics = useClassics();
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('classics.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('classics.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('classics.heading')}
        </h1>
        <p className="m-0 text-body">{t('classics.intro')}</p>
      </div>
      <div className="flex max-w-[860px] flex-col gap-6">
        <ClassicsBody classics={classics} />
      </div>
    </PageContainer>
  );
}
