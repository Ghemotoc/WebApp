/**
 * DoodleSheet: all 98 doodles in the page's current theme, the sign-off sheet, loaded only when
 * someone asks for it (Lane B, "Design: doodles take their colours from the tokens", 23 Oct 2026).
 *
 * Why on request: the 98 drawings are about 2.3 MB of SVG text. Bundled with /design they made
 * the page slow enough to load that its entrance animation could still be running when the
 * accessibility check measured contrast; now they are a separate chunk fetched by the button.
 * Who uses it: DoodleSection. What it calls: loadAllDoodles() (../doodleFiles.ts), DoodleTile.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import { loadAllDoodles, type DoodleFile } from '../doodleFiles';
import { DoodleTile } from './DoodleTile';

/** Where the sheet is: not asked for yet, loading, shown, or failed to load. */
type SheetState =
  | { status: 'closed' }
  | { status: 'loading' }
  | { status: 'shown'; doodles: DoodleFile[] }
  | { status: 'failed' };

/**
 * Renders the button, then the sheet once it has loaded.
 *
 * @returns the sheet area
 */
export function DoodleSheet() {
  const { t } = useTranslation('design');
  const [sheet, setSheet] = useState<SheetState>({ status: 'closed' });

  // Load the files once, when the button is pressed; a failure shows a plain message.
  async function showSheet() {
    setSheet({ status: 'loading' });
    try {
      setSheet({ status: 'shown', doodles: await loadAllDoodles() });
    } catch {
      setSheet({ status: 'failed' });
    }
  }

  if (sheet.status === 'shown') {
    return (
      <>
        <h3 className="m-0 text-xl font-bold">
          {t('doodles.all', { count: sheet.doodles.length })}
        </h3>
        <ul
          className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-3 p-0"
          data-testid="doodle-sheet"
        >
          {sheet.doodles.map((doodle) => (
            <DoodleTile key={doodle.id} doodle={doodle} size={64} />
          ))}
        </ul>
      </>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="secondary"
        onClick={() => void showSheet()}
        disabled={sheet.status === 'loading'}
      >
        {sheet.status === 'loading' ? t('doodles.loading') : t('doodles.showAll')}
      </Button>
      {sheet.status === 'failed' && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {t('doodles.loadFailed')}
        </p>
      )}
    </div>
  );
}
