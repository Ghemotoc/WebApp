/**
 * CanvaReturnPage: /canva/return, where Canva sends the tab back (story S1-E3-12).
 *
 * What it shows, for each way back (useCanvaReturn): "Connecting…" or "Bringing your cover
 * back…" while it works, "Nothing was shared" after a no on Canva's consent page, "Your cover is
 * saved" (with the picture check's state) after Return, or a plain reason. Always the way back to
 * the story's settings.
 * Who shows it: the router. What it calls: useCanvaReturn.
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';

import { useCanvaReturn, type CanvaReturnState } from '../hooks/useCanvaReturn';

import { CanvaTripPage } from './CanvaTripPage';

/** The message for the state. */
function ReturnMessage({ state }: { state: CanvaReturnState }) {
  const { t } = useTranslation('writing');
  if (state.kind === 'working') return <p className="m-0 text-body">{t('canva.working')}</p>;
  if (state.kind === 'cancelled') return <Notice tone="info">{t('canva.cancelled')}</Notice>;
  if (state.kind === 'failed') {
    return <Notice tone="error">{t(state.message.key, state.message.values)}</Notice>;
  }
  return (
    <Notice tone="success" title={t('canva.saved')}>
      {state.isChecking ? t('canva.savedChecking') : t('canva.savedVisible')}
    </Notice>
  );
}

/**
 * Renders the page.
 *
 * @returns the page
 */
export function CanvaReturnPage() {
  const state = useCanvaReturn();
  const backSlug = state.kind === 'working' ? null : state.slug;
  return (
    <CanvaTripPage backSlug={backSlug}>
      <ReturnMessage state={state} />
    </CanvaTripPage>
  );
}
