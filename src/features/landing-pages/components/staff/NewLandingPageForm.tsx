/**
 * NewLandingPageForm: starts a landing page with its address and type (story S1-E11-14
 * criterion 1; bundle CONTESTS-13a1).
 *
 * The address is <site>/c/<name>; the site comes from the brand config (src/config/brand.ts),
 * never from code. A name on the reserved names list or already in use is refused by the server,
 * and the form says which.
 * Who shows it: LandingPagesTab. What it calls: create() from useLandingPageList.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { brand } from '@/config/brand';
import { landingPageTypes, type LandingPageType } from '@/schemas/landingPages';

import type { useLandingPageList } from '../../hooks/useLandingPageEditor';
import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

/** What the form needs. */
interface NewLandingPageFormProps {
  list: ReturnType<typeof useLandingPageList>;
  /** Opens the new page in the editor. */
  onCreated: (pageId: string) => void;
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function NewLandingPageForm({ list, onCreated }: NewLandingPageFormProps) {
  const { t } = useLandingPageTranslation();
  const [slug, setSlug] = useState('');
  const [pageType, setPageType] = useState<LandingPageType>('contest');
  const failure = list.createFailure;
  /** Creates the page, then opens it. */
  async function submit(event: FormEvent) {
    event.preventDefault();
    const pageId = await list.create({ slug: slug.trim().toLowerCase(), pageType });
    if (pageId !== null) onCreated(pageId);
  }
  return (
    <form
      noValidate
      aria-labelledby="new-landing-page-heading"
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5"
    >
      <h2
        id="new-landing-page-heading"
        className="m-0 font-heading text-[20px] font-bold text-heading"
      >
        {t('list.newHeading')}
      </h2>
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-full max-w-[320px]">
          <TextInput
            id="new-landing-page-slug"
            label={t('list.address')}
            hint={t('list.addressHint', { site: brand.siteDomain })}
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
          />
        </div>
        <Select
          id="new-landing-page-type"
          label={t('list.type')}
          isLabelVisible
          value={pageType}
          onChange={(value) =>
            setPageType(landingPageTypes.find((type) => type === value) ?? 'contest')
          }
          options={landingPageTypes.map((type) => ({ value: type, label: t(`types.${type}`) }))}
        />
        <Button type="submit" disabled={list.isCreating}>
          {t('list.create')}
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
