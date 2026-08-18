import test from 'node:test';
import assert from 'node:assert';
import ComponentParser from '../../lib/compiler/ComponentParser.js';

test('ComponentParser <@deadlock> tag compilation', async (t) => {
  const parser = new ComponentParser();

  await t.test('compiles default <@deadlock> without attributes', () => {
    const template = '<@deadlock><div>Content</div></@deadlock>';
    const result = parser.processDeadlock(template);

    assert.strictEqual(result.includes('data-ax-deadlock="true"'), true);
    assert.strictEqual(result.includes('data-ax-deadlock-name="anonymous"'), true);
    assert.strictEqual(result.includes('<div>Content</div>'), true);
  });

  await t.test('compiles <@deadlock> with name, maxDepth, action, and isolated attributes', () => {
    const template = `
<@deadlock name="metrics-panel" maxDepth="12" action="fallback" isolated="true">
  <div class="metrics">Metric Card</div>
</@deadlock>
`.trim();
    const result = parser.processDeadlock(template);

    assert.strictEqual(result.includes('data-ax-deadlock="true"'), true);
    assert.strictEqual(result.includes('data-ax-deadlock-name="metrics-panel"'), true);
    assert.strictEqual(result.includes('data-ax-deadlock-depth="12"'), true);
    assert.strictEqual(result.includes('data-ax-deadlock-action="fallback"'), true);
    assert.strictEqual(result.includes('data-ax-deadlock-isolated="true"'), true);
    assert.strictEqual(result.includes('<div class="metrics">Metric Card</div>'), true);
  });

  await t.test('compiles <@deadlock> with <@fallback> and escaped expressions', () => {
    const template = `
<@deadlock name="chart-boundary" action="fallback">
  <div class="chart">Chart Data</div>
  <@fallback as="err">
    <div class="error-box">Cycle intercepted: {{ err.message }}</div>
  </@fallback>
</@deadlock>
`.trim();
    const result = parser.processDeadlock(template);

    assert.strictEqual(result.includes('data-ax-deadlock="true"'), true);
    assert.strictEqual(result.includes('data-ax-deadlock-name="chart-boundary"'), true);
    assert.strictEqual(result.includes('<template data-ax-deadlock-fallback="true" data-ax-error-as="err">'), true);
    assert.strictEqual(result.includes('Cycle intercepted: {% err.message %}'), true);
    assert.strictEqual(result.includes('<div class="chart">Chart Data</div>'), true);
  });

  await t.test('compiles nested <@deadlock> boundaries correctly', () => {
    const template = `
<@deadlock name="outer-boundary" maxDepth="20">
  <div class="outer-content">Outer</div>
  <@deadlock name="inner-boundary" maxDepth="5">
    <div class="inner-content">Inner</div>
  </@deadlock>
</@deadlock>
`.trim();
    const result = parser.processDeadlock(template);

    assert.strictEqual(result.includes('data-ax-deadlock-name="outer-boundary"'), true);
    assert.strictEqual(result.includes('data-ax-deadlock-depth="20"'), true);
    assert.strictEqual(result.includes('data-ax-deadlock-name="inner-boundary"'), true);
    assert.strictEqual(result.includes('data-ax-deadlock-depth="5"'), true);
    assert.strictEqual(result.includes('<div class="inner-content">Inner</div>'), true);
    assert.strictEqual(result.includes('<div class="outer-content">Outer</div>'), true);
  });

  await t.test('attaches source location data when filePath is provided', () => {
    const template = '<@deadlock name="loc-test"><div>Loc</div></@deadlock>';
    const result = parser.processDeadlock(template, 'src/components/card.component.js');

    assert.strictEqual(result.includes('data-ax-deadlock-loc="src/components/card.component.js:1:1"'), true);
  });
});
