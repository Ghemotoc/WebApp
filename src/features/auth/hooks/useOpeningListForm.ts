/**
 * useOpeningListForm: the state of "Tell me when you open here" (bundle G5, part a; story
 * S1-E2-10): the address, the picked country, the hidden bot field, when the form was opened and
 * what the server answered.
 *
 * Who calls it: components/OpeningListForm.tsx. What it calls: api/openingList.ts.
 */
import { useState, type FormEvent } from 'react';

import { joinOpeningList, type JoinOutcome } from '../api/openingList';

/**
 * Follows the form.
 *
 * @param country - the country of the connection, or null when it gave none (then one is picked)
 * @param language - the page's language, for the emails
 * @returns the fields, their setters, the outcome and the submit handler
 */
export function useOpeningListForm(country: string | null, language: 'ro' | 'en') {
  const [email, setEmail] = useState('');
  const [pickedCountry, setPickedCountry] = useState('');
  const [website, setWebsite] = useState('');
  const [openedAt] = useState(() => Date.now());
  const [outcome, setOutcome] = useState<JoinOutcome | null>(null);
  const [isSending, setIsSending] = useState(false);

  /** Sends the form; the server checks everything again. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Step 1: a country is needed when the connection gave none.
    if (country === null && pickedCountry === '') {
      setOutcome('no_country');
      return;
    }
    // Step 2: send, and keep what came back for the form to show.
    setIsSending(true);
    const result = await joinOpeningList({
      email: email.trim(),
      countryCode: country === null ? pickedCountry : undefined,
      language,
      website,
      openedAt,
    });
    setIsSending(false);
    setOutcome(result);
  }

  return {
    email,
    setEmail,
    pickedCountry,
    setPickedCountry,
    website,
    setWebsite,
    outcome,
    isSending,
    handleSubmit,
  };
}
