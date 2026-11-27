/**
 * NewThreadFields: the fields of New thread as board F04 draws them (bundle BOOKS-7, user story
 * 7.4): the Forum drop-down when the forum is picked on this page, the title with its hint ("Say
 * what the thread is about in a few words.") and the first post with the formatting bar.
 *
 * Each field shows what is missing, or the database's refusal, under it.
 * Who uses it: NewThreadForm. What it calls: Select, TextInput and PostEditor.
 */
import { FieldProblem } from '@/components/ui/FieldProblem';
import { Select, type SelectOption } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';

import { useForumsTranslation } from '../registerForumsTranslations';

import { PostEditor } from './PostEditor';

/** What the fields need. */
export interface NewThreadFieldsProps {
  ids: { forum: string; title: string; body: string };
  draft: {
    title: string;
    body: string;
    setTitle: (value: string) => void;
    setBody: (value: string) => void;
  };
  forumSlug: string;
  forumChoice?: { options: SelectOption[]; onChange: (forumSlug: string) => void };
  /** Wraps a setter so the contact-details check closes while typing (MUST-1b). */
  whileEditing: <Value>(apply: (value: Value) => void) => (value: Value) => void;
  /** What is missing or refused for each field, already translated, or null. */
  problems: { forum: string | null; title: string | null; body: string | null };
}

/**
 * Renders the fields.
 *
 * @returns the drop-down, the title and the editor
 */
export function NewThreadFields(props: NewThreadFieldsProps) {
  const { ids, draft, forumSlug, forumChoice, whileEditing, problems } = props;
  const { t } = useForumsTranslation();
  const setTitle = whileEditing(draft.setTitle);
  return (
    <>
      {forumChoice !== undefined && (
        <div className="flex flex-col gap-1">
          <Select
            id={ids.forum}
            label={t('newThread.forum')}
            isLabelVisible
            isLabelAbove
            options={forumChoice.options}
            value={forumSlug}
            onChange={forumChoice.onChange}
            isInvalid={problems.forum !== null}
            descriptionId={problems.forum === null ? undefined : `${ids.forum}-problem`}
          />
          <FieldProblem id={`${ids.forum}-problem`} isShown={problems.forum !== null}>
            {problems.forum}
          </FieldProblem>
        </div>
      )}
      <TextInput
        id={ids.title}
        label={t('editor.title')}
        hint={t('newThread.titleHint')}
        className="max-w-[480px]"
        value={draft.title}
        maxLength={120}
        onChange={(event) => setTitle(event.target.value)}
        errorMessage={problems.title ?? undefined}
      />
      <PostEditor
        id={ids.body}
        label={t('newThread.firstPost')}
        value={draft.body}
        onChange={whileEditing(draft.setBody)}
        problem={problems.body}
      />
    </>
  );
}
