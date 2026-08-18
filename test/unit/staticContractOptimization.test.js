import test from 'node:test';
import assert from 'node:assert/strict';
import ComponentParser from '../../lib/compiler/ComponentParser.js';
import StyleProcessor from '../../lib/compiler/StyleProcessor.js';

test('optimizeStaticSubtrees applies data-ax-static and strips raw contract attributes', () => {
  const sp = new StyleProcessor();
  const cp = new ComponentParser(sp);

  const tpl = `
    <div class="card">
      <header static class="card-header">
        <h1>Static Title</h1>
      </header>
      <@static>
        <p class="announcement">Important Notice</p>
      </@static>
      <div class="card-body">
        <p>{{ dynamicText }}</p>
      </div>
    </div>
  `;

  const optimized = cp.optimizeStaticSubtrees(tpl);

  // 1. Header with static contract has data-ax-static="true" and no raw "static" attribute
  assert.ok(optimized.includes('header class="card-header" data-ax-static="true"'));
  assert.ok(!optimized.includes('<header static'));

  // 2. <@static> block is transformed to div with data-ax-static="true"
  assert.ok(optimized.includes('<div data-ax-static="true">'));
  assert.ok(optimized.includes('<p class="announcement">Important Notice</p>'));

  // 3. Dynamic body is not static
  assert.ok(optimized.includes('<div class="card-body">'));
  assert.ok(!optimized.includes('<div class="card-body" data-ax-static'));
});
