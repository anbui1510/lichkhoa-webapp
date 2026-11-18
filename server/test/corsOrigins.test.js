import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCorsAllowlist, isOriginAllowed } from '../src/corsOrigins.js';

// docs/specs/features/F-305-multi-khoa-tenant/spec.md — BR-305-06

test('TC-F305-06a: localhost always allowed', () => {
  const list = buildCorsAllowlist({});
  assert.equal(isOriginAllowed('http://localhost:5173', list), true);
});

test('TC-F305-06b: CLIENT_ORIGIN_SUFFIX matches slug pages.dev', () => {
  const list = buildCorsAllowlist({
    CLIENT_ORIGIN_SUFFIX: '-lichkhoa-webapp.pages.dev',
  });
  assert.equal(isOriginAllowed('https://nhiem-lichkhoa-webapp.pages.dev', list), true);
  assert.equal(isOriginAllowed('https://lichkhoa-webapp.pages.dev', list), true);
  assert.equal(isOriginAllowed('https://evil.example.com', list), false);
});

test('TC-F305-06c: CLIENT_ORIGINS exact list', () => {
  const list = buildCorsAllowlist({
    CLIENT_ORIGINS: 'https://a.pages.dev, https://b.pages.dev',
  });
  assert.equal(isOriginAllowed('https://a.pages.dev', list), true);
  assert.equal(isOriginAllowed('https://c.pages.dev', list), false);
});

test('TC-F305-06d: legacy CLIENT_ORIGIN', () => {
  const list = buildCorsAllowlist({
    CLIENT_ORIGIN: 'https://lichkhoa-webapp.pages.dev',
  });
  assert.equal(isOriginAllowed('https://lichkhoa-webapp.pages.dev', list), true);
});
