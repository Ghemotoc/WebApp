/**
 * NewLandingPageForm: starts a landing page with its address and type (story S1-E11-14
 * criterion 1; bundle CONTESTS-13a1), blank or from a ready-made layout (story S1-E11-35; bundle
 * CMS-2c).
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
import {
  landingLayoutNames,
  landingLayouts,
  layoutContent,
  type LandingLayoutName,
} from '../../lib/layouts';
import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

/** "Blank page" in the layout list: no layout. */
const blankLayout = 'blank';

/** What the form needs. */
interface NewLandingPageFormProps {
  list: ReturnType<typeof useLandingPageList>;
  /** Opens the new page in the editor. */
  onCreated: (pageId: string) => void;
}

/**
 * The layout drop-down and the line saying which blocks the picked layout starts with.
 *
 * @param props.layout - the picked layout, or "blank"
 * @param props.onPick - called with the new pick
 * @returns the picker
 */
function LayoutPicker({ layout, onPick }: { layout: string; onPick: (layout: string) => void }) {
  const { t } = useLandingPageTranslation();
  const options = [blankLayout, ...landingLayoutNames].map((name) => ({
    value: name,
    label: t(`layouts.names.${name}`),
  }));
  return (
    <div className="flex flex-col gap-1">
      <Select
        id="new-landing-page-layout"
        label={t('list.layout')}
        isLabelVisible
        descriptionId="new-landing-page-layout-hint"
        value={layout}
        onChange={onPick}
        options={options}
      />
      <p id="new-landing-page-layout-hint" className="m-0 max-w-[420px] text-sm text-meta">
        {t(`layouts.hints.${layout}`)}
      </p>
    </div>
  );
}

/**
 * The form's state and its submit: the address, the type and the layout, which also sets the type.
 *
 * @param list - the page list (create() and its failure)
 * @param onCreated - opens the new page
 * @returns the fields, their setters and submit()
 */
function useNewPageForm(
  list: ReturnType<typeof useLandingPageList>,
  onCreated: (pageId: string) => void,
) {
  const { i18n } = useLandingPageTranslation();
  const [slug, setSlug] = useState('');
  const [pageType, setPageType] = useState<LandingPageType>('contest');
  const [layout, setLayout] = useState<string>(blankLayout);
  /** Picks a layout; its page type comes with it, so a contest layout makes a contest page. */
  function pickLayout(picked: string) {
    setLayout(picked);
    const known = landingLayoutNames.find((name) => name === picked);
    if (known !== undefined) setPageType(landingLayouts[known].pageType);
  }
  /** Creates the page, with the layout's starter words in both languages, then opens it. */
  async function submit(event: FormEvent) {
    event.preventDefault();
    const name: LandingLayoutName | undefined = landingLayoutNames.find((item) => item === layout);
    const words = (language: string, key: string) =>
      i18n.getFixedT(language, 'landingPages')(key, { defaultValue: '' });
    const pageId = await list.create({
      slug: slug.trim().toLowerCase(),
      pageType,
      layout: name === undefined ? null : { name, content: layoutContent(name, words) },
    });
    if (pageId !== null) onCreated(pageId);
  }
  return { slug, setSlug, pageType, setPageType, layout, pickLayout, submit };
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function NewLandingPageForm({ list, onCreated }: NewLandingPageFormProps) {
  const { t } = useLandingPageTranslation();
  const form = useNewPageForm(list, onCreated);
  const failure = list.createFailure;
  return (
    <form
      noValidate
      aria-labelledby="new-landing-page-heading"
      onSubmit={(event) => void form.submit(event)}
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
            value={form.slug}
            onChange={(event) => form.setSlug(event.target.value)}
          />
        </div>
        <LayoutPicker layout={form.layout} onPick={form.pickLayout} />
        <Select
          id="new-landing-page-type"
          label={t('list.type')}
          isLabelVisible
          value={form.pageType}
          onChange={(value) =>
            form.setPageType(landingPageTypes.find((type) => type === value) ?? 'contest')
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
