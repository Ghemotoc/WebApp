/**
 * MapZoomBar: "− Fit +" under the relationship map (bundle G10 ATLAS, part b2; board
 * AtlasConnections), with the zoom written out as a percentage for everyone, screen readers
 * included (it is announced when it changes).
 * Who uses it: RelationshipMap. What it calls: the useMapZoom actions it is given.
 */
import { Button } from '@/components/ui/Button';

import type { useMapZoom } from '../hooks/useMapZoom';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the three buttons and the percentage.
 *
 * @param zoomControls - what useMapZoom returned
 * @returns the zoom group
 */
export function MapZoomBar({ zoomControls }: { zoomControls: ReturnType<typeof useMapZoom> }) {
  const { t } = useAtlasTranslation();
  const { zoom, zoomIn, zoomOut, fit, canZoomIn, canZoomOut } = zoomControls;
  return (
    <div
      role="group"
      aria-label={t('connections.map.zoomLabel')}
      className="flex flex-wrap items-center gap-2"
    >
      <Button
        type="button"
        variant="secondary"
        aria-label={t('connections.map.zoomOut')}
        disabled={!canZoomOut}
        onClick={zoomOut}
      >
        −
      </Button>
      <Button type="button" variant="secondary" onClick={fit}>
        {t('connections.map.fit')}
      </Button>
      <Button
        type="button"
        variant="secondary"
        aria-label={t('connections.map.zoomIn')}
        disabled={!canZoomIn}
        onClick={zoomIn}
      >
        +
      </Button>
      <span aria-live="polite" className="text-sm text-meta">
        {t('connections.map.zoomNow', { percent: Math.round(zoom * 100) })}
      </span>
    </div>
  );
}
