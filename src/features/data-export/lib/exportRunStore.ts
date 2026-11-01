/**
 * Where the current copy stands in this tab, shared by every panel that shows it: one store for
 * Download my data (story S1-E13-02) and one for Download my stories (S1-E13-05).
 *
 * Why a small store and not component state: a copy keeps being made when the Settings panel
 * closes (it runs in the background of the tab, ADR 0012), so the state must outlive the panel.
 * Why this file is separate from runDataExport.ts and runStoriesExport.ts: a run brings the Word
 * and ZIP libraries with it, so it is loaded only when a copy is asked for and Settings stays small.
 * Who calls it: the hooks in ../hooks. What it calls: the two runs, loaded on demand.
 */
import type { DataExportRunOptions } from './runDataExport';
import type { StoriesExportOutcome, StoriesExportRunOptions } from './runStoriesExport';

/** Where the current run stands, for the Settings panel. */
export type DataExportRunState =
  { phase: 'idle' } | { phase: 'running' } | { phase: 'failed'; message: string };

/** One store: the state, a way to listen and a way to run a job while keeping the state. */
interface RunStore {
  subscribe: (listener: () => void) => () => void;
  state: () => DataExportRunState;
  run: (label: string, job: () => Promise<void>) => Promise<void>;
}

/**
 * Makes one store.
 *
 * @returns its subscribe, state and run functions
 */
function createRunStore(): RunStore {
  let currentState: DataExportRunState = { phase: 'idle' };
  const listeners = new Set<() => void>();
  const setRunState = (next: DataExportRunState) => {
    currentState = next;
    for (const listener of listeners) listener();
  };
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    state: () => currentState,
    run: async (label, job) => {
      // Only one run of each kind at a time in this tab.
      if (currentState.phase === 'running') return;
      setRunState({ phase: 'running' });
      try {
        await job();
        setRunState({ phase: 'idle' });
      } catch (error) {
        // Logged for the developer without any of the person's data; the panel shows a plain line.
        const message = error instanceof Error ? error.message : String(error);
        console.error(`${label} failed: ${message}`);
        setRunState({ phase: 'failed', message });
      }
    },
  };
}

const dataStore = createRunStore();
const storiesStore = createRunStore();

/** For useSyncExternalStore: listens for Download my data's state. */
export const subscribeToDataExportRun = dataStore.subscribe;

/** For useSyncExternalStore: Download my data's state now. */
export const dataExportRunState = dataStore.state;

/** For useSyncExternalStore: listens for Download my stories' state. */
export const subscribeToStoriesExportRun = storiesStore.subscribe;

/** For useSyncExternalStore: Download my stories' state now. */
export const storiesExportRunState = storiesStore.state;

/**
 * Starts a Download my data copy unless one is already being made in this tab.
 *
 * @param options - the client and the translated words
 * @returns once the copy is ready or has failed (a failure is in the state, never thrown)
 */
export async function startDataExport(options: DataExportRunOptions): Promise<void> {
  await dataStore.run('The data copy', async () => {
    // Load the run, and the Word and ZIP libraries with it, only now.
    const { makeDataExport } = await import('./runDataExport');
    await makeDataExport(options);
  });
}

/**
 * Starts a Download my stories copy unless one is already being made in this tab.
 *
 * @param options - the client, the translated words and the story (null for all)
 * @returns how it ended ('reused' or 'made'), or null when it failed or was already running
 */
export async function startStoriesExport(
  options: StoriesExportRunOptions,
): Promise<StoriesExportOutcome | null> {
  let outcome: StoriesExportOutcome | null = null;
  await storiesStore.run('The Word files', async () => {
    const { makeStoriesExport } = await import('./runStoriesExport');
    outcome = await makeStoriesExport(options);
  });
  return outcome;
}
