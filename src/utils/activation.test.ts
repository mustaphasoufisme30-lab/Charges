import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVATION_KEY,
  normalizeActivationKey,
  validateActivationKey,
} from './activation';

test('activation key constant matches HIBA2026', () => {
  assert.equal(ACTIVATION_KEY, 'HIBA2026');
});

test('empty or whitespace-only input is rejected with a clear French error', () => {
  const empty = validateActivationKey('');
  assert.equal(empty.valid, false);
  assert.ok(empty.error && empty.error.includes('saisir'));

  const spaces = validateActivationKey('    ');
  assert.equal(spaces.valid, false);
  assert.ok(spaces.error && spaces.error.includes('saisir'));
});

test('wrong keys are rejected without bypassing validation', () => {
  const wrong = validateActivationKey('HIBA2025');
  assert.equal(wrong.valid, false);
  assert.ok(wrong.error && wrong.error.includes('invalide'));

  const partial = validateActivationKey('HIBA');
  assert.equal(partial.valid, false);
});

test('valid key HIBA2026 succeeds regardless of surrounding spaces or case', () => {
  assert.equal(normalizeActivationKey('  hiba2026  '), 'HIBA2026');
  assert.deepEqual(validateActivationKey('HIBA2026'), { valid: true, error: null });
  assert.deepEqual(validateActivationKey('  hiba2026 '), { valid: true, error: null });
});
