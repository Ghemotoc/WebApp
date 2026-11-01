/**
 * Where the current "Download my data" copy stands in this tab, shared by every panel that shows
 * it (story S1-E13-02).
 *
 * Why a small store and not component state: the copy keeps being made when the Settings panel
 * closes (it runs in the background of the tab, ADR 0012), so the state must outlive the panel.
 * Why this file is separate from runDataExport.ts: the run brings the Word and ZIP libraries with
 * it, so it is loaded only when a copy is asked for and Settings stays small.
 * Who calls it: useDataExportRun() and useStartDataExport(). What it calls: runDataExport.ts,
 * loaded on demand.
 */
import type { DataExportRunOptions } from './runDataExport';

/** Where the current run stands, for the Settings panel. */
export type DataExportRunState =
  { phase: 'idle' } | { phase: 'running' } | { phase: 'failed'; message: string };

let currentState: DataExportRunState = { phase: 'idle' };
const listeners = new Set<() => void>();

/** Changes the state and tells every panel. */
function setRunState(next: DataExportRunState): void {
  currentState = next;
  for (const listener of listeners) listener();
}

/** For useSyncExternalStore: listens for state changes. */
export function subscribeToDataExportRun(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** For useSyncExternalStore: the state now. */
export function dataExportRunState(): DataExportRunState {
  return currentState;
}

/**
 * Starts a copy unless one is already being made in this tab, and keeps the state up to date.
 *
 * @param options - the client and the translated words
 * @returns once the copy is ready or has failed (a failure is in the state, never thrown)
 */
export async function startDataExport(options: DataExportRunOptions): Promise<void> {
  if (currentState.phase === 'running') return;
  setRunState({ phase: 'running' });
  try {
    // Step 1: load the run, and the Word and ZIP libraries with it, only now.
    const { makeDataExport } = await import('./runDataExport');
    // Step 2: make the copy.
    await makeDataExport(options);
    setRunState({ phase: 'idle' });
  } catch (error) {
    // Logged for the developer without any of the person's data; the panel shows a plain line.
    const message = error instanceof Error ? error.message : String(error);
    console.error(`The data copy failed: ${message}`);
    setRunState({ phase: 'failed', message });
  }
}
