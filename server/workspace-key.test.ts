import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceKey } from '../src/workspace-key.js';

test('creates a valid workspace key without crypto.randomUUID', () => {
  const cryptoWithoutRandomUuid = {
    getRandomValues(values: Uint8Array) {
      values.forEach((_, index) => { values[index] = index; });
      return values;
    },
  };
  const key = createWorkspaceKey(cryptoWithoutRandomUuid);
  assert.match(key, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.equal(key, '00010203-0405-4607-8809-0a0b0c0d0e0f');
});

test('keeps a non-secret fallback for browsers without Web Crypto', () => {
  assert.match(createWorkspaceKey(undefined), /^[a-f0-9-]{36}$/);
});
