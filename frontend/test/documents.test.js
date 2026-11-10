import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INVALID_OWNER_MESSAGE, isValidOwner, listDocuments } from '../src/services/documents.js';

test('valida identificadores compatíveis com o cabeçalho HTTP', () => {
  for (const owner of ['ana', 'João', 'usuário-123', 'a'.repeat(128)]) {
    assert.equal(isValidOwner(owner), true);
  }
  for (const owner of ['', '   ', 'usuário😀', '漢字', 'ana\n', 'a'.repeat(129)]) {
    assert.equal(isValidOwner(owner), false);
  }
});

test('rejeita identificador incompatível antes de chamar fetch', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = () => { called = true; };
  try {
    await assert.rejects(listDocuments('usuário😀'), { message: INVALID_OWNER_MESSAGE });
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});