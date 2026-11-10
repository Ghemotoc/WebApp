/**
 * useMapZoom: the zoom of the relationship map (bundle G10 ATLAS, part b2; board AtlasConnections:
 * "− Fit +" under the map).
 *
 * The map starts at "Fit": the zoom that shows the whole map across the region's width, never
 * larger than full size, so a phone sees every card at once. The − and + buttons step through
 * fixed levels, and Fit goes back to fitting. The region's width is measured again whenever it
 * changes (a phone turned sideways, a window resized).
 * Who calls it: RelationshipMap. What it calls: fitZoom() and zoomLevels in lib/relationshipMap.ts.
 */
import { useLayoutEffect, useRef, useState } from 'react';

import { fitZoom, zoomLevels } from '../lib/relationshipMap';

/**
 * The map's zoom and the region to measure.
 *
 * @param mapWidth - the map's width at full size
 * @returns the zoom now, the region's ref and the three buttons' actions and states
 */
export function useMapZoom(mapWidth: number) {
  const regionRef = useRef<HTMLDivElement>(null);
  const [regionWidth, setRegionWidth] = useState(0);
  // null means "Fit": the zoom follows the region's width.
  const [chosenZoom, setChosenZoom] = useState<number | null>(null);

  // Step 1: measure the region now and whenever it changes size (browsers without
  // ResizeObserver keep the first measurement).
  useLayoutEffect(() => {
    const region = regionRef.current;
    if (region === null) return undefined;
    const measure = () => setRegionWidth(region.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(region);
    return () => observer.disconnect();
  }, []);

  // Step 2: the zoom now, and the next level each way.
  const zoom = chosenZoom ?? fitZoom(mapWidth, regionWidth);
  const larger = zoomLevels.find((level) => level > zoom + 0.001);
  const smaller = [...zoomLevels].reverse().find((level) => level < zoom - 0.001);

  return {
    zoom,
    regionRef,
    zoomIn: () => setChosenZoom(larger ?? zoom),
    zoomOut: () => setChosenZoom(smaller ?? zoom),
    fit: () => setChosenZoom(null),
    canZoomIn: larger !== undefined,
    canZoomOut: smaller !== undefined,
  };
}
