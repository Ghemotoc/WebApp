/**
 * ClassCodeForm: "Type the code to join your class", on /class with no code (bundle CLASSES, part
 * b; story S1-E8-11 criterion 5, board ClassSpace: "Students type it in Forums › Join a class").
 *
 * Who shows it: JoinClassPage, when the address has no code (the "Join a class" links on the
 * Forums page's Spaces card and on the Spaces page open it).
 * What it does: takes the code the teacher wrote on the board and opens /class/<code>, where
 * JoinClassPage checks it. Nothing is sent to the server from here.
 * G8e (board ClassJoin): the intro shows what a code looks like, the button reads "Find the
 * class" and a small note under it says what shows before joining.
 */
import { type FormEvent, useState } from 'react';
import { Trans } from 'react-i18next';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * Renders the form.
 *
 * @returns the code field, "Find the class" and the privacy note
 */
export function ClassCodeForm() {
  const { t } = useSpacesTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [isEmpty, setIsEmpty] = useState(false);

  /** Opens the code's page, or says the field is empty. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Codes are read without spaces either side, as a student may copy one with a space.
    const trimmed = code.trim();
    if (trimmed === '') {
      setIsEmpty(true);
      return;
    }
    void navigate(`/class/${encodeURIComponent(trimmed)}`);
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      {/* The example code stays on one line, so a phone never splits it at a dash. */}
      <p className="m-0 text-base leading-relaxed text-body">
        <Trans
          t={t}
          i18nKey="joinClass.enterIntro"
          components={{ example: <span className="font-semibold whitespace-nowrap" /> }}
        />
      </p>
      <TextInput
        id="class-code"
        label={t('joinClass.code')}
        hint={t('joinClass.codeHint')}
        errorMessage={isEmpty ? t('joinClass.codeEmpty') : undefined}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        value={code}
        onChange={(event) => {
          setCode(event.target.value);
          setIsEmpty(false);
        }}
      />
      <Button type="submit" size="lg" className="self-start">
        {t('joinClass.check')}
      </Button>
      <p className="m-0 text-sm text-body">{t('joinClass.privacyNote')}</p>
    </form>
  );
}
