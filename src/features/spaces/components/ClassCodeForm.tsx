/**
 * ClassCodeForm: the code field on "Join a class", at /class with no code (bundle CLASSES, part b;
 * story S1-E8-11 criterion 5; board G01-ClassJoin, user story 8.1).
 *
 * Who shows it: JoinClassPage, when the address has no code (the footer's "Join a class", the
 * Forums page's Spaces card and the Spaces page open it).
 * What it does: takes the code the teacher wrote on the board, asks class_invite_preview() whether
 * it works, and opens /class/<code> (the invite, board G02) when it does. A code that is unknown or
 * has ended is said under the field and the field keeps what was typed (user story 8.1). Case and
 * dashes don't matter: the database reads the code that way (class_invite_row()).
 * BOOKS-8 (board G01): the button runs the width of the page's column, as drawn.
 * What it calls: fetchClassInvitePreview() → class_invite_preview().
 */
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchClassInvitePreview } from '../api/classSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/** What the field says under it: nothing, empty, unknown, ended or the server unreachable. */
type CodeProblem = 'empty' | 'unknown' | 'ended' | 'unreachable' | null;

/** The locale key of each problem. */
const problemKeys = {
  empty: 'joinClass.codeEmpty',
  unknown: 'joinClass.codeUnknown',
  ended: 'joinClass.ended',
  unreachable: 'joinClass.loadFailed',
} as const;

/**
 * Asks the database what a code opens.
 *
 * @param code - the code as typed, without spaces either side
 * @returns null when the code works, otherwise the problem to show
 */
async function problemWithCode(code: string): Promise<CodeProblem> {
  try {
    const preview = await fetchClassInvitePreview(await requireClient(), code);
    if (preview.status === 'valid') return null;
    return preview.status;
  } catch {
    // A network fault is said in words; the typed code stays in the field.
    return 'unreachable';
  }
}

/**
 * Renders the form.
 *
 * @returns the code field and "Find the class"
 */
export function ClassCodeForm() {
  const { t } = useSpacesTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [problem, setProblem] = useState<CodeProblem>(null);
  const [isChecking, setIsChecking] = useState(false);

  /** Shows a problem under the field and takes the pupil back to it (DoD, member forms). */
  function showProblem(found: Exclude<CodeProblem, null>) {
    setProblem(found);
    document.getElementById('class-code')?.focus();
  }

  /** Checks the code, then opens its invite or says what is wrong. */
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Step 1: codes are read without spaces either side, as a pupil may copy one with a space.
    const trimmed = code.trim();
    if (trimmed === '') {
      showProblem('empty');
      return;
    }
    // Step 2: ask the database; only a working code leaves the page.
    setIsChecking(true);
    const found = await problemWithCode(trimmed);
    setIsChecking(false);
    if (found !== null) {
      showProblem(found);
      return;
    }
    void navigate(`/class/${encodeURIComponent(trimmed)}`);
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
      <div className="w-full max-w-[480px]">
        <TextInput
          id="class-code"
          label={t('joinClass.code')}
          hint={t('joinClass.codeHint')}
          errorMessage={problem === null ? undefined : t(problemKeys[problem])}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            setProblem(null);
          }}
        />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={isChecking}>
        {t('joinClass.check')}
      </Button>
    </form>
  );
}
