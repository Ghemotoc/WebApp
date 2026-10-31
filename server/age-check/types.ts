/**
 * What our server needs from an age check service: Yoti's Age Verification API or the stand-in
 * (story S1-E2-08, part 08a; ADR 0010).
 * Who uses it: server/age-check.ts. Who implements it: yoti.ts and stub.ts in this folder.
 */
import type { AgeCheckResult } from '../../src/schemas/ageCheck';

/** What a new session needs. */
export interface NewAgeCheckSession {
  /** The age line: 13 or 18. */
  threshold: number;
  /** A fresh random UUID, never stored, so it says nothing about the person (criterion 1). */
  referenceId: string;
  /** Where Yoti sends the person back: our /age-check/return page. */
  returnUrl: string;
  /** Where Yoti tells our server a session finished: /api/age-check/webhook. */
  notificationUrl: string;
}

/** A created session: its ID and the page the person opens. */
export interface CreatedAgeCheckSession {
  sessionId: string;
  checkUrl: string;
}

/** One age check service. */
export interface AgeCheckService {
  /** Our SDK ID, which the app may know (criterion 1); empty for the stand-in. */
  sdkId: string;
  /** Creates a session; null when the service refused or couldn't be reached. */
  createSession: (session: NewAgeCheckSession) => Promise<CreatedAgeCheckSession | null>;
  /**
   * Checks a notification's signature and reads the session it names (criterion 4).
   *
   * @returns the session ID, or null for an unsigned or invalid notification
   */
  readNotification: (rawBody: string, headers: Headers) => Promise<string | null>;
  /**
   * Fetches the session's result from the service before anything is saved (criterion 4).
   *
   * @returns passed or failed with its method, or null while it isn't finished (or was cancelled
   *   or expired), so nothing is stored
   */
  fetchResult: (sessionId: string, rawBody: string) => Promise<AgeCheckResult | null>;
}
