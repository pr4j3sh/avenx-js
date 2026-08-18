import test from 'node:test';
import assert from 'node:assert/strict';
import { AvenxError, AvenxErrorCodes, formatMessage } from '../../lib/core/runtime/AvenxError.js';

test('Contract error codes and messages are defined properly', () => {
  assert.equal(AvenxErrorCodes.COMPILER_CONTRACT_STATIC_VIOLATION, 'AVX_C04');
  assert.equal(AvenxErrorCodes.COMPILER_CONTRACT_ISOLATED_VIOLATION, 'AVX_C05');
  assert.equal(AvenxErrorCodes.COMPILER_CONTRACT_INVALID_DECLARATION, 'AVX_C06');
  assert.equal(AvenxErrorCodes.COMPILER_CONTRACT_PURE_VIOLATION, 'AVX_W32');
  assert.equal(AvenxErrorCodes.COMPILER_CONTRACT_DETERMINISTIC_VIOLATION, 'AVX_W33');
  assert.equal(AvenxErrorCodes.COMPILER_CONTRACT_REDUNDANT, 'AVX_W34');

  const staticErr = new AvenxError(AvenxErrorCodes.COMPILER_CONTRACT_STATIC_VIOLATION, '{{ count }}');
  assert.ok(staticErr.message.includes('AVX_C04'));
  assert.ok(staticErr.message.includes('{{ count }}'));

  const isolatedErr = new AvenxError(AvenxErrorCodes.COMPILER_CONTRACT_ISOLATED_VIOLATION, 'Card', '$bridges.userStore');
  assert.ok(isolatedErr.message.includes('AVX_C05'));
  assert.ok(isolatedErr.message.includes('Card'));
  assert.ok(isolatedErr.message.includes('$bridges.userStore'));

  const pureWarn = formatMessage(AvenxErrorCodes.COMPILER_CONTRACT_PURE_VIOLATION, 'PureCard', 'state.count = 1');
  assert.ok(pureWarn.includes('AVX_W32'));
  assert.ok(pureWarn.includes('PureCard'));
  assert.ok(pureWarn.includes('state.count = 1'));
});
