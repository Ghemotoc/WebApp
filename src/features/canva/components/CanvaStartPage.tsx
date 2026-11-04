/**
 * CanvaStartPage: /canva/start?story=<story ID>, the page "Design it in Canva" opens in a new tab
 * (story S1-E3-12 criteria 1 and 4).
 *
 * What it shows: "Where do you want to start?" (a blank design or a cover template with the title
 * and pen name placed, CanvaTemplatePicker, IDEAS-2e), then "Opening Canva…" while our server
 * answers, then the tab leaves for Canva (its consent page the first time, the new design after
 * that). If something stops it, a plain
 * reason and the way back.
 * Who shows it: the router. What it calls: useCanvaStart.
 */
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';

import { useCanvaStart } from '../hooks/useCanvaStart';

import { CanvaTemplatePicker } from './CanvaTemplatePicker';
import { CanvaTripPage } from './CanvaTripPage';

/**
 * Renders the page.
 *
 * @returns the page
 */
export function CanvaStartPage() {
  const { t } = useTranslation('writing');
  const [params] = useSearchParams();
  const { state, open } = useCanvaStart(params.get('story') ?? '');
  return (
    <CanvaTripPage backSlug={null}>
      {state.kind === 'choosing' && (
        <CanvaTemplatePicker storyTitle={state.storyTitle} penName={state.penName} onOpen={open} />
      )}
      {state.kind === 'opening' && <p className="m-0 text-body">{t('canva.opening')}</p>}
      {state.kind === 'signed_out' && <p className="m-0 text-body">{t('canva.signedOut')}</p>}
      {state.kind === 'not_found' && (
        <Notice tone="error">{t('canva.failed.storyNotFound')}</Notice>
      )}
      {state.kind === 'failed' && (
        <Notice tone="error">{t(state.message.key, state.message.values)}</Notice>
      )}
    </CanvaTripPage>
  );
}
