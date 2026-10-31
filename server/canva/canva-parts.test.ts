/**
 * Unit tests for the Canva helpers (story S1-E3-12; ADR 0009): the token encryption, the return
 * token checks (Canva's RS256 and the stand-in's HS256) and the stand-in's PNG.
 * Who runs it: `npm test`.
 */
import { describe, expect, it } from 'vitest';

import { signStandInJwt, verifyCanvaJwt, verifyStandInJwt, type PublicJwk } from './jwt';
import { crc32, standInDesignPng } from './png';
import { decryptToken, encryptToken, toBase64Url, tokenKeyFrom } from './tokens';

/** A random 32-byte key as base64. */
function randomSecret(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
}

/** Signs claims with an RSA key, as Canva does. */
async function signRs256(privateKey: CryptoKey, kid: string, claims: Record<string, unknown>) {
  const encode = (value: unknown) => toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
  const signedPart = `${encode({ alg: 'RS256', kid })}.${encode(claims)}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signedPart),
  );
  return `${signedPart}.${toBase64Url(new Uint8Array(signature))}`;
}

/** A fresh RSA key pair and its public key as a JWKS entry. */
async function canvaLikeKeys() {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );
  const publicJwk: PublicJwk = {
    ...(await crypto.subtle.exportKey('jwk', pair.publicKey)),
    kid: 'k1',
  };
  return { privateKey: pair.privateKey, publicJwk };
}

describe('the Canva token encryption', () => {
  it('gives back the same token with the same key, and nothing with another key', async () => {
    const key = await tokenKeyFrom(randomSecret());
    const otherKey = await tokenKeyFrom(randomSecret());
    if (key === null || otherKey === null) throw new Error('the keys should be made');
    const sealed = await encryptToken(key, 'canva-access-token');
    expect(sealed.startsWith('v1.')).toBe(true);
    expect(sealed).not.toContain('canva-access-token');
    expect(await decryptToken(key, sealed)).toBe('canva-access-token');
    expect(await decryptToken(otherKey, sealed)).toBeNull();
    expect(await decryptToken(key, `${sealed.slice(0, -2)}AA`)).toBeNull();
  });

  it('refuses a missing key or one that is not 32 bytes', async () => {
    expect(await tokenKeyFrom(undefined)).toBeNull();
    expect(await tokenKeyFrom('')).toBeNull();
    expect(await tokenKeyFrom(btoa('too short'))).toBeNull();
    expect(await tokenKeyFrom('not base64 at all!')).toBeNull();
  });
});

describe("Canva's return token", () => {
  const now = new Date('2026-11-03T12:00:00Z');
  const claims = {
    design_id: 'DAF123',
    correlation_state: '11111111-1111-4111-8111-111111111111',
    aud: 'our-client',
    exp: Math.floor(now.getTime() / 1000) + 60,
  };

  it('is accepted when Canva signed it for our app and it has not expired', async () => {
    const { privateKey, publicJwk } = await canvaLikeKeys();
    const jwt = await signRs256(privateKey, 'k1', claims);
    expect(await verifyCanvaJwt(jwt, [publicJwk], { now, audience: 'our-client' })).toEqual({
      designId: 'DAF123',
      correlationState: claims.correlation_state,
    });
  });

  it('is refused when expired, for another app, signed by another key or changed', async () => {
    const { privateKey, publicJwk } = await canvaLikeKeys();
    const other = await canvaLikeKeys();
    const options = { now, audience: 'our-client' };
    const expired = await signRs256(privateKey, 'k1', { ...claims, exp: 1 });
    expect(await verifyCanvaJwt(expired, [publicJwk], options)).toBeNull();
    const otherApp = await signRs256(privateKey, 'k1', { ...claims, aud: 'someone-else' });
    expect(await verifyCanvaJwt(otherApp, [publicJwk], options)).toBeNull();
    const forged = await signRs256(other.privateKey, 'k1', claims);
    expect(await verifyCanvaJwt(forged, [publicJwk], options)).toBeNull();
    const good = await signRs256(privateKey, 'k1', claims);
    const [header, , signature] = good.split('.');
    const changed = `${header}.${toBase64Url(new TextEncoder().encode('{"design_id":"X"}'))}.${signature}`;
    expect(await verifyCanvaJwt(changed, [publicJwk], options)).toBeNull();
    expect(await verifyCanvaJwt('not-a-jwt', [publicJwk], options)).toBeNull();
  });

  it("is never accepted from the stand-in's key in real mode, and the reverse", async () => {
    const { publicJwk } = await canvaLikeKeys();
    const standIn = await signStandInJwt({ designId: 'D', correlationState: 'S' }, now);
    expect(await verifyCanvaJwt(standIn, [publicJwk], { now, audience: 'our-client' })).toBeNull();
    expect(await verifyStandInJwt(standIn, now)).toEqual({ designId: 'D', correlationState: 'S' });
    const later = new Date(now.getTime() + 6 * 60 * 1000);
    expect(await verifyStandInJwt(standIn, later)).toBeNull();
  });
});

describe("the stand-in's PNG", () => {
  it('is a real PNG at the size asked for, with good checksums', async () => {
    const png = await standInDesignPng(16, 24);
    expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const view = new DataView(png.buffer);
    expect(new TextDecoder().decode(png.slice(12, 16))).toBe('IHDR');
    expect(view.getUint32(16)).toBe(16);
    expect(view.getUint32(20)).toBe(24);
    expect(view.getUint32(29)).toBe(crc32(png.slice(12, 29)));
    expect(new TextDecoder().decode(png.slice(-8, -4))).toBe('IEND');
  });

  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
});
