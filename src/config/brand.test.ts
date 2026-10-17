/**
 * Tests for the brand config (story S1-E1-01).
 * Proves the acceptance criterion "the product name, site domain, email addresses and social
 * handle come from one brand config built from VITE_ variables".
 */
import { describe, expect, it } from 'vitest';

import { brandDefaults, readBrand } from './brand';

describe('readBrand', () => {
  it("uses today's values when no variable is set", () => {
    const brand = readBrand({});

    expect(brand.productName).toBe(brandDefaults.productName);
    expect(brand.siteDomain).toBe(brandDefaults.siteDomain);
    expect(brand.contactEmail).toBe(brandDefaults.contactEmail);
    expect(brand.supportEmail).toBe(brandDefaults.supportEmail);
    expect(brand.socialHandle).toBe(brandDefaults.socialHandle);
    expect(brand.companyName).toBe(brandDefaults.companyName);
  });

  it("uses today's values when it is called outside Vite with no environment at all", () => {
    expect(readBrand(undefined).productName).toBe(brandDefaults.productName);
  });

  it('takes every value from its VITE_BRAND_ variable when one is set', () => {
    const brand = readBrand({
      VITE_BRAND_NAME: 'Test Name',
      VITE_BRAND_SITE_DOMAIN: 'test.example.com',
      VITE_BRAND_CONTACT_EMAIL: 'contact@example.com',
      VITE_BRAND_SUPPORT_EMAIL: 'support@example.com',
      VITE_BRAND_PRIVACY_EMAIL: 'privacy@example.com',
      VITE_BRAND_SOCIAL_HANDLE: '@test',
      VITE_BRAND_COMPANY_NAME: 'Test Company',
    });

    expect(brand).toEqual({
      productName: 'Test Name',
      siteDomain: 'test.example.com',
      siteUrl: 'https://test.example.com',
      contactEmail: 'contact@example.com',
      supportEmail: 'support@example.com',
      privacyEmail: 'privacy@example.com',
      socialHandle: '@test',
      companyName: 'Test Company',
    });
  });

  it("treats a blank variable as missing and falls back to today's value", () => {
    expect(readBrand({ VITE_BRAND_NAME: '   ' }).productName).toBe(brandDefaults.productName);
  });

  it('builds the site address from the domain over HTTPS', () => {
    expect(readBrand({}).siteUrl).toBe(`https://${brandDefaults.siteDomain}`);
  });
});
