/**
 * Tests for describeCall (bundle LOGS-1, part c): which calls the call log keeps, and that names
 * carry nothing that identifies anyone.
 */
import { describe, expect, it } from 'vitest';

import { describeCall } from './describeCall';

const supabaseUrl = 'https://abc.supabase.co';
const pageOrigin = 'https://app.example.test';

describe('describeCall', () => {
  it('names an RPC and a table, without the query string', () => {
    expect(
      describeCall(`${supabaseUrl}/rest/v1/rpc/my_discover_cards`, supabaseUrl, pageOrigin),
    ).toEqual({
      kind: 'rpc',
      name: 'my_discover_cards',
    });
    expect(
      describeCall(
        `${supabaseUrl}/rest/v1/stories?select=*&handle=eq.lia`,
        supabaseUrl,
        pageOrigin,
      ),
    ).toEqual({ kind: 'table', name: 'stories' });
  });

  it('names an Auth step, an edge function and a Storage bucket, never the file path', () => {
    expect(
      describeCall(`${supabaseUrl}/auth/v1/token?grant_type=password`, supabaseUrl, pageOrigin),
    ).toEqual({ kind: 'auth', name: 'token' });
    expect(describeCall(`${supabaseUrl}/functions/v1/send-email`, supabaseUrl, pageOrigin)).toEqual(
      {
        kind: 'function',
        name: 'send-email',
      },
    );
    expect(
      describeCall(
        `${supabaseUrl}/storage/v1/object/public/covers/00000000-0000-4000-8000-000000000001/a.png`,
        supabaseUrl,
        pageOrigin,
      ),
    ).toEqual({ kind: 'storage', name: 'object/covers' });
  });

  it('names our own /api calls with IDs and tokens replaced', () => {
    expect(
      describeCall(
        '/api/parent-consent/00000000-0000-4000-8000-000000000001',
        supabaseUrl,
        pageOrigin,
      ),
    ).toEqual({ kind: 'api', name: '/api/parent-consent/:id' });
    expect(
      describeCall('/api/invites/abcdefghijklmnopqrstuvwxyz', supabaseUrl, pageOrigin),
    ).toEqual({
      kind: 'api',
      name: '/api/invites/:id',
    });
  });

  it('leaves out the call log’s own call and addresses that aren’t ours', () => {
    expect(
      describeCall(`${supabaseUrl}/rest/v1/rpc/log_calls`, supabaseUrl, pageOrigin),
    ).toBeNull();
    expect(
      describeCall('https://fonts.example.test/inter.woff2', supabaseUrl, pageOrigin),
    ).toBeNull();
    expect(describeCall('/assets/logo.svg', supabaseUrl, pageOrigin)).toBeNull();
    expect(
      describeCall(`${supabaseUrl}/realtime/v1/websocket`, supabaseUrl, pageOrigin),
    ).toBeNull();
  });
});
