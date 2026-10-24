/**
 * Checks how the session-start hook (.claude/hooks/session-start.sh) treats the Docker pid file
 * ("Tooling: session-start hook checks the pid file points at dockerd", 23 Oct 2026).
 *
 * Why: after a container restart the old /var/run/docker.pid named PID 192, an unrelated process
 * then had that number, and the hook trusted the file, so Docker never started.
 * How: each test writes its own pid file in a temporary folder, sources the hook in bash (sourcing
 * only defines its functions; nothing runs) with DOCKER_PID_FILE pointing at that file, and calls
 * `remove_stale_docker_pid_file`. The "real dockerd" is a copy of `sleep` named dockerd, because
 * the hook checks the program name Linux records for the process. Linux only: the hook reads /proc.
 */
import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const hookPath = fileURLToPath(new URL('../.claude/hooks/session-start.sh', import.meta.url));

/** Processes started by a test, stopped again after it. */
let startedProcesses: ChildProcess[] = [];
/** The test's own temporary folder, holding the pid file and the fake dockerd. */
let workFolder = '';
/** The pid file the hook is pointed at. */
let pidFile = '';

/**
 * Starts a long `sleep` under the given program name, so it shows up in /proc/<pid>/comm as that
 * name.
 *
 * @param programName - the name the process runs under, for example "dockerd"
 * @returns the started process's number
 * @throws when the process didn't start
 */
function startProcessNamed(programName: string): number {
  // Copy sleep under the new name, then run the copy for longer than any test takes.
  const programPath = join(workFolder, programName);
  copyFileSync('/bin/sleep', programPath);
  const child = spawn(programPath, ['300'], { stdio: 'ignore' });
  startedProcesses.push(child);
  if (child.pid === undefined) {
    throw new Error(`${programName} didn't start`);
  }
  return child.pid;
}

/**
 * Sources the hook and runs `remove_stale_docker_pid_file` against the test's pid file.
 *
 * @returns what the hook printed
 * @throws when bash exits with an error
 */
function runPidFileCheck(): string {
  return execFileSync('bash', ['-c', `source "${hookPath}" && remove_stale_docker_pid_file`], {
    env: { ...process.env, DOCKER_PID_FILE: pidFile },
    encoding: 'utf8',
  });
}

beforeEach(() => {
  // A fresh folder per test, so one test's files never affect another.
  workFolder = mkdtempSync(join(tmpdir(), 'session-start-hook-'));
  pidFile = join(workFolder, 'docker.pid');
});

afterEach(() => {
  // Stop every process the test started, then delete its folder.
  for (const child of startedProcesses) {
    child.kill();
  }
  startedProcesses = [];
  rmSync(workFolder, { recursive: true, force: true });
});

describe.runIf(process.platform === 'linux')(
  'the session-start hook and the Docker pid file',
  () => {
    it('removes a pid file that names a running process which is not dockerd', () => {
      writeFileSync(pidFile, `${startProcessNamed('unrelated')}\n`);

      const output = runPidFileCheck();

      expect(existsSync(pidFile)).toBe(false);
      expect(output).toContain("isn't dockerd");
    });

    it('removes a pid file that names a process which is no longer running', () => {
      // Process numbers on Linux stay far below this one, so nothing can be running under it.
      writeFileSync(pidFile, '999999999\n');

      runPidFileCheck();

      expect(existsSync(pidFile)).toBe(false);
    });

    it('removes a pid file that holds no process number', () => {
      writeFileSync(pidFile, 'not a number\n');

      runPidFileCheck();

      expect(existsSync(pidFile)).toBe(false);
    });

    it('keeps a pid file that names a running dockerd', () => {
      writeFileSync(pidFile, `${startProcessNamed('dockerd')}\n`);

      const output = runPidFileCheck();

      expect(existsSync(pidFile)).toBe(true);
      expect(output).toBe('');
    });

    it('does nothing when there is no pid file', () => {
      expect(runPidFileCheck()).toBe('');
    });
  },
);
