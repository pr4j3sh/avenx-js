import test from 'node:test';
import assert from 'node:assert/strict';
import ComponentParser from '../../../lib/compiler/ComponentParser.js';
import ContractValidator from '../../../lib/compiler/ContractValidator.js';
import StyleProcessor from '../../../lib/compiler/StyleProcessor.js';
import { AvenxComponent } from '../../../lib/core/runtime/AvenxComponent.js';
import { AvenxErrorCodes } from '../../../lib/core/runtime/AvenxError.js';

test('Integration: Nested contracts with static inside pure and deterministic', () => {
  const tpl = `
    <div class="root" isolated>
      <section pure deterministic class="stat-widget">
        <header static class="stat-header">
          <h2>Stats Overview</h2>
        </header>
        <div class="stat-value">
          <span>{{ props.count }}</span>
        </div>
      </section>
    </div>
  `;

  const sp = new StyleProcessor();
  const cp = new ComponentParser(sp);

  const ast = ComponentParser.parseHTML(tpl);
  const validation = ContractValidator.validate(ast, {
    name: 'StatWidget',
    contracts: new Set(),
  });

  assert.equal(validation.valid, true);
  assert.equal(validation.errors.length, 0);

  const optimized = cp.optimizeStaticSubtrees(tpl);
  assert.ok(optimized.includes('header class="stat-header" data-ax-static="true"'));
  assert.ok(optimized.includes('section class="stat-widget" data-ax-memo="true"'));
});

test('Integration: Invalid static contract containing loop or slot throws AVX_C04', () => {
  // 1. Static containing slot
  const tplSlot = '<div static><slot></slot></div>';
  const astSlot = ComponentParser.parseHTML(tplSlot);
  const valSlot = ContractValidator.validate(astSlot, { name: 'SlotComp' });
  assert.equal(valSlot.valid, false);
  assert.equal(valSlot.errors[0].code, AvenxErrorCodes.COMPILER_CONTRACT_STATIC_VIOLATION);

  // 2. Static containing loop interpolation
  const tplLoop = '<div static><@for item in list key="item"><span>{{ item }}</span></@for></div>';
  const astLoop = ComponentParser.parseHTML(tplLoop);
  const valLoop = ContractValidator.validate(astLoop, { name: 'LoopComp' });
  assert.equal(valLoop.valid, false);
  assert.equal(valLoop.errors[0].code, AvenxErrorCodes.COMPILER_CONTRACT_STATIC_VIOLATION);
});

test('Integration: Full component instantiation with isolated, pure, deterministic contracts', () => {
  const comp = new AvenxComponent(
    { count: 10 },
    { double: 'this.state.count * 2' },
    { globalStore: { token: 'secret' } },
    '<div class="counter">{{ props.label }}: {{ double }}</div>',
    {
      increment() {
        this.state.count++;
      },
    },
    { label: 'Score' },
    {},
    {},
    { contracts: ['isolated', 'pure', 'deterministic'] }
  );

  assert.ok(comp.contracts.has('isolated'));
  assert.ok(comp.contracts.has('pure'));
  assert.ok(comp.contracts.has('deterministic'));
  assert.equal(comp.contracts.has('static'), false);

  // Isolated component must not have globalStore in its accessible bridges
  assert.deepEqual(comp._getBridges(), {});
});

test('Integration: Static contract on top-level component guarantees data-ax-static on root', () => {
  const sp = new StyleProcessor();
  const cp = new ComponentParser(sp);

  const tpl = `
    <div class="hero-banner">
      <h1>Welcome to Avenx</h1>
      <p>Blazing fast reactive framework</p>
    </div>
  `;

  const ast = ComponentParser.parseHTML(tpl);
  const validation = ContractValidator.validate(ast, {
    name: 'HeroBanner',
    contracts: new Set(['static']),
  });

  assert.equal(validation.valid, true);
  const opt = cp.optimizeStaticSubtrees(tpl);
  assert.ok(opt.includes('div class="hero-banner" data-ax-static="true"'));
});
