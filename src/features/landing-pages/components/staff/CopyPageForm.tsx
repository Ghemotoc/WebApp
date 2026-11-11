/**
 * CopyPageForm: "Copy this page" under a landing page's editor (story S1-E11-35; bundle CMS-2c).
 *
 * Staff give the copy its own address; the database makes a new page of the same type whose
 * draft holds this page's saved words (the draft, or the newest version), and logs it. Nothing
 * goes live until the copy is published. The copy then opens in the editor.
 * Who shows it: LandingPageEditor. What it calls: copy() from useLandingPageList.
 */
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { StaffLandingPage } from '../../api/landingPages';
import { useLandingPageList } from '../../hooks/useLandingPageEditor';
import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

/**
 * Renders the form.
 *
 * @param props.page - the page to copy
 * @returns the form
 */
export function CopyPageForm({ page }: { page: StaffLandingPage }) {
  const { t } = useLandingPageTranslation();
  const list = useLandingPageList();
  const [, setSearchParams] = useSearchParams();
  const [slug, setSlug] = useState(`${page.slug}-copy`);
  const failure = list.copyFailure;
  /** Copies the page, then opens the copy (its id goes in the address, like any open page). */
  async function submit(event: FormEvent) {
    event.preventDefault();
    const copyId = await list.copy({ sourcePageId: page.id, slug: slug.trim().toLowerCase() });
    if (copyId !== null) setSearchParams({ page: copyId });
  }
  return (
    <form
      noValidate
      aria-labelledby="landing-copy-heading"
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
    >
      <h3 id="landing-copy-heading" className="m-0 font-heading text-lg font-bold text-heading">
        {t('copy.heading')}
      </h3>
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-full max-w-[320px]">
          <TextInput
            id="landing-copy-slug"
            label={t('copy.address')}
            hint={t('copy.hint')}
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={list.isCopying}>
          {t('copy.button')}
        </Button>
      </div>
      <div aria-live="polite">
        {failure !== null && (
          <Notice tone="error">
            {t(`list.failures.${failure.reason ?? failure.failure}`, {
              defaultValue: t('list.failures.unreachable'),
            })}
          </Notice>
        )}
      </div>
    </form>
  );
}
