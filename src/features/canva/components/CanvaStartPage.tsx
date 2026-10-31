/**
 * CanvaStartPage: /canva/start?story=<story ID>, the page "Design it in Canva" opens in a new tab
 * (story S1-E3-12 criteria 1 and 4).
 *
 * What it shows: "Opening Canva…" while our server answers, then the tab leaves for Canva (its
 * consent page the first time, the new design after that). If something stops it, a plain
 * reason and the way back.
 * Who shows it: the router. What it calls: useCanvaStart.
 */
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';

import { useCanvaStart } from '../hooks/useCanvaStart';

import { CanvaTripPage } from './CanvaTripPage';

/**
 * Renders the page.
 *
 * @returns the page
 */
export function CanvaStartPage() {
  const { t } = useTranslation('writing');
  const [params] = useSearchParams();
  const start = useCanvaStart(params.get('story') ?? '');
  return (
    <CanvaTripPage backSlug={null}>
      {start.kind === 'opening' && <p className="m-0 text-body">{t('canva.opening')}</p>}
      {start.kind === 'signed_out' && <p className="m-0 text-body">{t('canva.signedOut')}</p>}
      {start.kind === 'not_found' && (
        <Notice tone="error">{t('canva.failed.storyNotFound')}</Notice>
      )}
      {start.kind === 'failed' && (
        <Notice tone="error">{t(start.message.key, start.message.values)}</Notice>
      )}
    </CanvaTripPage>
  );
}
