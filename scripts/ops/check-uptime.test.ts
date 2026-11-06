/**
 * Tests for the uptime checks' definition of "up" (QA-8, finding H1).
 * Who runs it: `npm test` (Vitest).
 */
import { describe, expect, it } from 'vitest';

import { judgeAnswer, uptimeChecks } from './check-uptime';

/** One check by its name, failing the test when it is missing. */
function checkNamed(name: string) {
  const check = uptimeChecks('statia-meteo-seed01').find((candidate) => candidate.name === name);
  if (check === undefined) throw new Error(`no check named ${name}`);
  return check;
}
const webApp = checkNamed('web app');
const storyPreview = checkNamed('story link preview');
const reportFunction = checkNamed('report form function');

describe('the uptime checks', () => {
  it('check the web app, the story link preview, the report form page and its function', () => {
    expect(uptimeChecks('a-story').map((check) => check.path)).toEqual([
      '/',
      '/s/a-story',
      '/report',
      '/api/notice',
    ]);
  });

  it('count the web app as up when it answers 200 with the app page', () => {
    expect(judgeAnswer(webApp, 200, '<html><div id="root"></div></html>').isUp).toBe(true);
  });

  it('count the story link preview as down when the plain app page answers instead', () => {
    const result = judgeAnswer(storyPreview, 200, '<div id="root"></div>');
    expect(result.isUp).toBe(false);
    expect(result.detail).toContain('og:title');
  });

  it('count the report function as up only when a GET is refused with 405', () => {
    expect(judgeAnswer(reportFunction, 405, '').isUp).toBe(true);
    expect(judgeAnswer(reportFunction, 404, '').isUp).toBe(false);
    expect(judgeAnswer(reportFunction, 502, '').detail).toBe('answered 502, expected 405');
  });
});
