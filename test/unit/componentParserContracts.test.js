import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import ComponentParser from '../../lib/compiler/ComponentParser.js';
import StyleProcessor from '../../lib/compiler/StyleProcessor.js';
import { AvenxErrorCodes } from '../../lib/core/runtime/AvenxError.js';

const tempDir = path.join(process.cwd(), 'test', 'temp_contract_parser_tests');

test.before(() => {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
});

test.after(() => {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('ComponentParser throws AVX_C04 when compiling component with static contract violation', () => {
  const filePath = path.join(tempDir, 'invalid-static.component.js');
  fs.writeFileSync(
    filePath,
    `
    <contract static />
    <state count="0" />
    <template>
      <div>Count: {{ count }}</div>
    </template>
    `
  );

  const sp = new StyleProcessor();
  const cp = new ComponentParser(sp);

  assert.throws(
    () => cp.parse(filePath),
    (err) => {
      return err.code === AvenxErrorCodes.COMPILER_CONTRACT_STATIC_VIOLATION;
    }
  );
});

test('ComponentParser throws AVX_C05 when compiling component with isolated contract violation', () => {
  const filePath = path.join(tempDir, 'invalid-isolated.component.js');
  fs.writeFileSync(
    filePath,
    `
    <contract isolated />
    <computed name="user" value="this.$bridges.userStore.name" />
    <template>
      <div>User: {{ user }}</div>
    </template>
    `
  );

  const sp = new StyleProcessor();
  const cp = new ComponentParser(sp);

  assert.throws(
    () => cp.parse(filePath),
    (err) => {
      return err.code === AvenxErrorCodes.COMPILER_CONTRACT_ISOLATED_VIOLATION;
    }
  );
});

test('ComponentParser successfully compiles valid contracted components', () => {
  const filePath = path.join(tempDir, 'valid-contracts.component.js');
  fs.writeFileSync(
    filePath,
    `
    <contract isolated pure deterministic />
    <template>
      <div class="user-badge">
        <span>{{ props.badgeName }}</span>
        <div static class="static-footer">
          <small>Copyright 2026</small>
        </div>
      </div>
    </template>
    `
  );

  const sp = new StyleProcessor();
  const cp = new ComponentParser(sp);
  const result = cp.parse(filePath);

  assert.ok(result.includes('class ValidContracts extends AvenxComponent'));
  assert.ok(result.includes('data-ax-static="true"'));
});
