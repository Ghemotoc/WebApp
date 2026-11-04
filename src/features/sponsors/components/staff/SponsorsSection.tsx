/**
 * SponsorsSection: the sponsors list and "Add sponsor" on Staff › Sponsors (story S1-E12-02
 * criterion 1).
 *
 * A sponsor is a name and, optionally, its website (https only). Their name is what readers see
 * on "Sponsored" and "Sponsored by". Who shows it: StaffSponsorsPage. What it calls:
 * useSponsorChanges().
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

import type { Sponsor } from '../../api/sponsors';
import { useSponsorChanges } from '../../hooks/useSponsorsAdmin';
import { useSponsorTranslation } from '../../registerSponsorTranslations';

import { ChangeOutcome } from './ChangeOutcome';

/** The add form. */
function AddSponsorForm() {
  const { t } = useSponsorTranslation();
  const changes = useSponsorChanges();
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  // Step 1: send it; on success, empty the fields for the next one.
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void changes
      .change({ kind: 'save_sponsor', id: null, name, websiteUrl })
      .then(() => {
        setName('');
        setWebsiteUrl('');
      })
      .catch(() => undefined);
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          id="sponsor-name"
          label={t('sponsors.name')}
          maxLength={80}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <TextInput
          id="sponsor-website"
          type="url"
          label={t('sponsors.website')}
          value={websiteUrl}
          onChange={(event) => setWebsiteUrl(event.target.value)}
        />
      </div>
      <div>
        <Button type="submit" variant="secondary" disabled={changes.isRunning}>
          {t('sponsors.add')}
        </Button>
      </div>
      <ChangeOutcome
        successText={t('sponsors.added')}
        isDone={changes.isDone}
        failure={changes.failure}
      />
    </form>
  );
}

/**
 * Renders the section.
 *
 * @returns the sponsors and the add form
 */
export function SponsorsSection({ sponsors }: { sponsors: Sponsor[] }) {
  const { t } = useSponsorTranslation();
  return (
    <section aria-labelledby="sponsors-heading" className="flex flex-col gap-3">
      <h2 id="sponsors-heading" className="m-0 font-heading text-[22px] font-bold text-heading">
        {t('sponsors.heading')}
      </h2>
      <p className="m-0 text-body">{t('sponsors.intro')}</p>
      {sponsors.length === 0 ? (
        <p className="m-0 text-body">{t('sponsors.empty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0 text-sm">
          {sponsors.map((sponsor) => (
            <li key={sponsor.id} className="flex flex-wrap gap-x-3 border-b border-hairline py-2">
              <span className="font-semibold text-ink">{sponsor.name}</span>
              {sponsor.websiteUrl !== '' && (
                <span className="break-all text-meta">{sponsor.websiteUrl}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <AddSponsorForm />
    </section>
  );
}
