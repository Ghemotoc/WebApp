/**
 * The chapter draft kept on the device (story S1-E3-02b; board 4.3: "You're offline. Your
 * changes are kept on this device and will save when you're back online").
 *
 * What it is: a small IndexedDB store, one record per chapter code, holding the title, the body
 * (Markdown), the server version the text started from and when it was kept. The autosave
 * writes it on every change and clears it once the server has the text, so a copy is only ever
 * there while something is unsaved: after a lost connection, a closed tab or a crash.
 * Why IndexedDB and not localStorage: a chapter can be 100,000 characters and a writer can have
 * many; IndexedDB has room and never blocks the page.
 * Who calls it: useAutosave (keep and forget) and ChapterEditorPage (read on load).
 * Nothing here leaves the device; the record holds the chapter's code and text, never the user ID.
 */

/** What is kept for one chapter. */
export interface DeviceDraft {
  code: string;
  title: string;
  body: string;
  /** The server's draft_version the text was based on; a lower number than the server's is a conflict. */
  baseVersion: number;
  /** When it was kept, as the device's clock said (milliseconds since the epoch). */
  keptAt: number;
}

const DATABASE_NAME = 'writing-drafts';
const STORE_NAME = 'chapter-drafts';
const DATABASE_VERSION = 1;

/**
 * Opens the database, creating the store on first use.
 *
 * @returns the open database
 * Errors: rejects when the browser refuses IndexedDB (private mode on some browsers); callers
 *   treat that as "nothing kept".
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'code' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB is not available'));
  });
}

/** Runs one request inside a transaction on the store and waits for it. */
async function withStore<Result>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<Result>,
): Promise<Result> {
  const database = await openDatabase();
  try {
    return await new Promise<Result>((resolve, reject) => {
      const request = run(database.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    });
  } finally {
    database.close();
  }
}

/**
 * Keeps the draft on the device.
 *
 * @param draft - the chapter's code, text and base version
 * Errors: never throws; a device that refuses storage just keeps nothing.
 */
export async function keepDraftOnDevice(draft: Omit<DeviceDraft, 'keptAt'>): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.put({ ...draft, keptAt: Date.now() }));
  } catch {
    // Storage refused (private mode, quota): the server copy is still the safety net.
  }
}

/**
 * Reads the draft kept for a chapter, if any.
 *
 * @param code - the chapter's code
 * @returns the kept draft, or null when there is none or storage is refused
 */
export async function readDraftOnDevice(code: string): Promise<DeviceDraft | null> {
  try {
    const found = await withStore<DeviceDraft | undefined>('readonly', (store) => store.get(code));
    return found ?? null;
  } catch {
    return null;
  }
}

/**
 * Forgets the kept draft once the server has the text.
 *
 * @param code - the chapter's code
 * Errors: never throws.
 */
export async function forgetDraftOnDevice(code: string): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.delete(code));
  } catch {
    // Nothing to do: a stale copy is harmless, the version check catches it on load.
  }
}
