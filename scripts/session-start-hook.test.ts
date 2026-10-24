/**
 * Checks two steps of the session-start hook (.claude/hooks/session-start.sh): how it treats the
 * Docker pid file ("Tooling: session-start hook checks the pid file points at dockerd",
 * 23 Oct 2026) and how it points Playwright at the pre-installed Chromium ("Tooling:
 * session-start hook points Playwright at the pre-installed Chromium", 24 Oct 2026).
 *
 * Why: after a container restart the old /var/run/docker.pid named PID 192, an unrelated process
 * then had that number, and the hook trusted the file, so Docker never started.
 * How: each test writes its own pid file in a temporary folder, sources the hook in bash (sourcing
 * only defines its functions; nothing runs) with DOCKER_PID_FILE pointing at that file, and calls
 * `remove_stale_docker_pid_file`. The "real dockerd" is a copy of `sleep` named dockerd, because
 * the hook checks the program name Linux records for the process. Linux only: the hook reads /proc.
 * Chromium: each test makes its own "browser" (an empty runnable file) and its own CLAUDE_ENV_FILE
 * in the temporary folder, runs `use_preinstalled_chromium`, then reads what the hook wrote.
 */
import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
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

/**
 * Sources the hook and runs `use_preinstalled_chromium` with the test's own browser path and env
 * file. PLAYWRIGHT_CHROMIUM_PATH is removed first, because this session's own hook may have set it
 * for the test process; a test that wants it set passes it in `chosenBrowser`.
 *
 * @param browserPath - where the hook should look for the pre-installed Chromium
 * @param chosenBrowser - a PLAYWRIGHT_CHROMIUM_PATH someone already set, if any
 * @returns what the hook printed
 * @throws when bash exits with an error
 */
function runChromiumStep(browserPath: string, chosenBrowser?: string): string {
  // Copy the environment without the variable, then add it back only when the test chose one.
  const environment: NodeJS.ProcessEnv = { ...process.env };
  delete environment.PLAYWRIGHT_CHROMIUM_PATH;
  if (chosenBrowser !== undefined) {
    environment.PLAYWRIGHT_CHROMIUM_PATH = chosenBrowser;
  }
  environment.PREINSTALLED_CHROMIUM = browserPath;
  environment.CLAUDE_ENV_FILE = join(workFolder, 'claude-env.sh');
  return execFileSync('bash', ['-c', `source "${hookPath}" && use_preinstalled_chromium`], {
    env: environment,
    encoding: 'utf8',
  });
}

/**
 * Makes a stand-in for the browser: an empty file in the test's folder.
 *
 * @param canBeRun - whether to mark it as a program that can be run
 * @returns the file's path
 */
function makeFakeBrowser(canBeRun: boolean): string {
  const browserPath = join(workFolder, 'chromium');
  writeFileSync(browserPath, '');
  chmodSync(browserPath, canBeRun ? 0o755 : 0o644);
  return browserPath;
}

/**
 * Reads the CLAUDE_ENV_FILE the hook wrote, or an empty string when it wrote nothing.
 *
 * @returns the file's text
 */
function readEnvFile(): string {
  const envFile = join(workFolder, 'claude-env.sh');
  return existsSync(envFile) ? readFileSync(envFile, 'utf8') : '';
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

describe('the session-start hook and the pre-installed Chromium', () => {
  it('tells later commands to use the browser when it is there and nothing else was chosen', () => {
    const browserPath = makeFakeBrowser(true);

    const output = runChromiumStep(browserPath);

    expect(readEnvFile()).toBe(`export PLAYWRIGHT_CHROMIUM_PATH="${browserPath}"\n`);
    expect(output).toContain('pre-installed Chromium');
    // The line must work when Claude Code runs the file before a command, as it does for real.
    const seenByLaterCommand = execFileSync(
      'bash',
      ['-c', `source "${join(workFolder, 'claude-env.sh')}" && echo "$PLAYWRIGHT_CHROMIUM_PATH"`],
      { encoding: 'utf8' },
    );
    expect(seenByLaterCommand.trim()).toBe(browserPath);
  });

  it('adds the line only once when the session resumes and the hook runs again', () => {
    const browserPath = makeFakeBrowser(true);

    runChromiumStep(browserPath);
    runChromiumStep(browserPath);

    expect(
      readEnvFile()
        .split('\n')
        .filter((line) => line !== ''),
    ).toHaveLength(1);
  });

  it('leaves a browser someone already chose alone', () => {
    const browserPath = makeFakeBrowser(true);

    const output = runChromiumStep(browserPath, '/somewhere/else/chrome');

    expect(readEnvFile()).toBe('');
    expect(output).toContain('already set');
  });

  it('does nothing when there is no browser at that path', () => {
    const output = runChromiumStep(join(workFolder, 'no-browser-here'));

    expect(readEnvFile()).toBe('');
    expect(output).toBe('');
  });

  it('does nothing when the file there cannot be run', () => {
    const browserPath = makeFakeBrowser(false);

    runChromiumStep(browserPath);

    expect(readEnvFile()).toBe('');
  });
});
