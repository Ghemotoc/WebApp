/**
 * usePictureBitmap: a chapter picture, decoded for drawing on the picture card (story S1-E4-11).
 *
 * The picture is fetched as a file and decoded with createImageBitmap, so the canvas can still be
 * saved as a PNG afterwards (an image drawn straight from another address could lock the canvas).
 * The address is the short-lived signed one get_chapter() gave for a picture the reader may see.
 * The quote card uses it for its picture backgrounds too (GAPS-7).
 * Who calls it: PictureCardDialog and useCardBackground. What it calls: fetch and createImageBitmap.
 */
import { useEffect, useState } from 'react';

/** The picture, or why it isn't there. */
export interface PictureBitmapState {
  bitmap: ImageBitmap | null;
  failed: boolean;
}

/**
 * Fetches and decodes the picture.
 *
 * @param url - the picture's signed address, or null when there is no picture to load
 * @returns the decoded picture once ready, and whether it failed
 */
export function usePictureBitmap(url: string | null): PictureBitmapState {
  const [state, setState] = useState<PictureBitmapState>({ bitmap: null, failed: false });
  useEffect(() => {
    // Nothing to load: the state stays (or goes back to) empty.
    if (url === null) {
      setState({ bitmap: null, failed: false });
      return;
    }
    const address = url;
    let isCurrent = true;
    /** Fetches the file, decodes it and keeps it, unless the address changed meanwhile. */
    async function load() {
      try {
        const response = await fetch(address);
        if (!response.ok) throw new Error(`The picture answered ${response.status}.`);
        const bitmap = await createImageBitmap(await response.blob());
        if (isCurrent) setState({ bitmap, failed: false });
      } catch (error) {
        console.warn('The picture for the card could not be loaded.', error);
        if (isCurrent) setState({ bitmap: null, failed: true });
      }
    }
    void load();
    return () => {
      isCurrent = false;
    };
  }, [url]);
  return state;
}
