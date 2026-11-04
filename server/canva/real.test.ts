/**
 * The real Canva service's cover templates (bundle IDEAS-2, part e; idea IDEA-20261101-10), with
 * Canva's API answered by a fake fetch, so nothing leaves the machine.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { realCanva } from './real';

/** The start every test uses. */
const start = { title: 'Stația meteo', template: 'classic', penName: 'Ana' } as const;

/**
 * A fake fetch that answers each Canva address with a fixed body, and records what was asked.
 *
 * @returns the fake and the list of addresses asked
 */
function fakeCanva(answers: Record<string, unknown>) {
  const asked: { address: string; body: unknown }[] = [];
  const fake = vi.fn((address: string, init?: { body?: string }) => {
    const path = address.replace('https://api.canva.com/rest/v1', '');
    asked.push({
      address: path,
      body: init?.body === undefined ? undefined : JSON.parse(init.body),
    });
    const answer = answers[path];
    return Promise.resolve(
      new Response(JSON.stringify(answer ?? {}), { status: answer === undefined ? 500 : 200 }),
    );
  });
  vi.stubGlobal('fetch', fake);
  return asked;
}

const blankAnswer = {
  design: { id: 'blank-1', urls: { edit_url: 'https://canva.example/blank' } },
};

describe('cover templates in the real Canva service', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fills our brand template with the title and pen name', async () => {
    const asked = fakeCanva({
      '/autofills': { job: { id: 'job-1', status: 'in_progress' } },
      '/autofills/job-1': {
        job: {
          status: 'success',
          result: {
            design: { id: 'filled-1', urls: { edit_url: 'https://canva.example/filled' } },
          },
        },
      },
    });
    const canva = realCanva({
      clientId: 'id',
      clientSecret: 'secret',
      templateIds: { classic: 'BT1' },
    });
    const design = await canva.createDesign('token', start);
    expect(design).toEqual({ designId: 'filled-1', editUrl: 'https://canva.example/filled' });
    expect(asked[0]?.body).toEqual({
      brand_template_id: 'BT1',
      title: 'Stația meteo',
      data: {
        title: { type: 'text', text: 'Stația meteo' },
        pen_name: { type: 'text', text: 'Ana' },
      },
    });
  });

  it('opens a blank design when the template has no ID yet', async () => {
    const asked = fakeCanva({ '/designs': blankAnswer });
    const canva = realCanva({ clientId: 'id', clientSecret: 'secret' });
    expect(await canva.createDesign('token', start)).toEqual({
      designId: 'blank-1',
      editUrl: 'https://canva.example/blank',
    });
    expect(asked.map((call) => call.address)).toEqual(['/designs']);
  });

  it('opens a blank design when Canva can not fill the template', async () => {
    fakeCanva({ '/designs': blankAnswer });
    const canva = realCanva({
      clientId: 'id',
      clientSecret: 'secret',
      templateIds: { classic: 'BT1' },
    });
    expect((await canva.createDesign('token', start))?.designId).toBe('blank-1');
  });

  it('never asks for a template when the writer chose blank', async () => {
    const asked = fakeCanva({ '/designs': blankAnswer });
    const canva = realCanva({
      clientId: 'id',
      clientSecret: 'secret',
      templateIds: { classic: 'BT1' },
    });
    await canva.createDesign('token', { ...start, template: 'blank' });
    expect(asked.map((call) => call.address)).toEqual(['/designs']);
  });
});
