/**
 * Checks the signed token Canva sends back when the writer presses Return (story S1-E3-12
 * criterion 2; ADR 0009).
 *
 * Canva's return token is a JWT signed with RS256; its public keys are published at Canva's
 * keys address (a JWKS). We check the signature with the key whose "kid" matches, that it hasn't
 * expired and, when it names one, that it was made for our app ("aud"). Then we read which design
 * came back and our correlation state (the story's ID). The stand-in signs its tokens with HS256
 * and a fixed key, which proves nothing, so it is only ever used in stand-in mode.
 * Who calls it: server/canva/real.ts and server/canva/stub.ts.
 */
import { fromBase64, toBase64Url } from './tokens';

/** What a checked return token says. */
export interface CanvaReturn {
  designId: string;
  correlationState: string;
}

/** One public key from Canva's JWKS. */
export interface PublicJwk extends JsonWebKey {
  kid?: string;
}

/** A JWT's three parts, read but not yet trusted. */
interface JwtParts {
  header: { alg?: string; kid?: string };
  payload: Record<string, unknown>;
  signedPart: Uint8Array<ArrayBuffer>;
  signature: Uint8Array<ArrayBuffer>;
}

/**
 * Splits a JWT and reads its header and payload.
 *
 * @returns the parts, or null when it isn't a JWT
 */
function readJwt(jwt: string): JwtParts | null {
  const [header, payload, signature] = jwt.split('.');
  if (header === undefined || payload === undefined || signature === undefined) return null;
  try {
    const decode = (part: string): unknown =>
      JSON.parse(new TextDecoder().decode(fromBase64(part)));
    return {
      header: decode(header) as JwtParts['header'],
      payload: decode(payload) as Record<string, unknown>,
      signedPart: new TextEncoder().encode(`${header}.${payload}`),
      signature: fromBase64(signature),
    };
  } catch {
    return null;
  }
}

/**
 * Reads the payload once the signature is good.
 *
 * @param payload - the token's claims
 * @param now - the time to check expiry against
 * @param audience - our app's client ID, checked when the token names one
 * @returns the design and the correlation state, or null when expired, for another app or empty
 */
function returnFromPayload(
  payload: Record<string, unknown>,
  now: Date,
  audience: string | null,
): CanvaReturn | null {
  const { exp, aud, design_id: designId, correlation_state: correlationState } = payload;
  if (typeof exp !== 'number' || exp * 1000 <= now.getTime()) return null;
  if (audience !== null && aud !== undefined && aud !== audience) return null;
  if (typeof designId !== 'string' || typeof correlationState !== 'string') return null;
  return { designId, correlationState };
}

/**
 * Checks a return token signed by Canva (RS256).
 *
 * @param jwt - the correlation_jwt from the address
 * @param keys - Canva's public keys
 * @param options - the time now and our client ID
 * @returns what came back, or null when anything doesn't check out
 */
export async function verifyCanvaJwt(
  jwt: string,
  keys: PublicJwk[],
  options: { now: Date; audience: string },
): Promise<CanvaReturn | null> {
  const parts = readJwt(jwt);
  if (parts === null || parts.header.alg !== 'RS256') return null;
  const jwk = keys.find((key) => key.kid === parts.header.kid);
  if (jwk === undefined) return null;
  const algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
  const key = await crypto.subtle
    .importKey('jwk', jwk, algorithm, false, ['verify'])
    .catch(() => null);
  if (key === null) return null;
  const isGood = await crypto.subtle.verify(algorithm, key, parts.signature, parts.signedPart);
  if (!isGood) return null;
  return returnFromPayload(parts.payload, options.now, options.audience);
}

/** The stand-in's fixed signing key: it proves nothing, so it is used only in stand-in mode. */
const standInKey = new TextEncoder().encode('canva-stand-in-return-key');

/**
 * The HMAC key the stand-in signs with.
 *
 * @returns the key
 */
function standInHmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', standInKey, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

/**
 * Makes a stand-in return token, as Canva would after Return.
 *
 * @param claims - the design and the correlation state
 * @param now - the time it is made; it expires five minutes later
 * @returns the token
 */
export async function signStandInJwt(claims: CanvaReturn, now: Date): Promise<string> {
  const encode = (value: unknown) => toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    design_id: claims.designId,
    correlation_state: claims.correlationState,
    exp: Math.floor(now.getTime() / 1000) + 300,
  });
  const signed = new TextEncoder().encode(`${header}.${payload}`);
  const signature = await crypto.subtle.sign('HMAC', await standInHmacKey(), signed);
  return `${header}.${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Checks a stand-in return token.
 *
 * @returns what came back, or null when the signature is wrong or it expired
 */
export async function verifyStandInJwt(jwt: string, now: Date): Promise<CanvaReturn | null> {
  const parts = readJwt(jwt);
  if (parts === null || parts.header.alg !== 'HS256') return null;
  const isGood = await crypto.subtle.verify(
    'HMAC',
    await standInHmacKey(),
    parts.signature,
    parts.signedPart,
  );
  if (!isGood) return null;
  return returnFromPayload(parts.payload, now, null);
}
