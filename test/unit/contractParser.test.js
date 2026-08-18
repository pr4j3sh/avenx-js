import test from 'node:test';
import assert from 'node:assert/strict';
import ExpressionParser from '../../lib/compiler/expressionParser.js';
import ComponentParser from '../../lib/compiler/ComponentParser.js';

test('ExpressionParser extracts contracts from <contract /> tags', () => {
  const parser = new ExpressionParser();

  const src1 = `
    <contract static />
    <template><div>Hello</div></template>
  `;
  const contracts1 = parser.parseContracts(src1);
  assert.ok(contracts1.has('static'));
  assert.equal(contracts1.size, 1);

  const src2 = `
    <contract pure="true" deterministic="true" isolated />
    <template><div>Hello</div></template>
  `;
  const contracts2 = parser.parseContracts(src2);
  assert.ok(contracts2.has('pure'));
  assert.ok(contracts2.has('deterministic'));
  assert.ok(contracts2.has('isolated'));
  assert.equal(contracts2.size, 3);

  const src3 = `
    <@contract isolated />
    <template><div>Hello</div></template>
  `;
  const contracts3 = parser.parseContracts(src3);
  assert.ok(contracts3.has('isolated'));
});

test('ComponentParser.parseHTML parses contracts on HTMLNode and elements', () => {
  const tpl = `<div static class="container">
    <section pure deterministic>
      <span isolated>Content</span>
    </section>
    <@static>
      <p>Block static</p>
    </@static>
  </div>`;
  const nodes = ComponentParser.parseHTML(tpl);
  const elements = nodes.filter((n) => n.type === 'element');
  assert.equal(elements.length, 1);
  const root = elements[0];
  assert.ok(root.contracts.has('static'), 'Root div has static contract');

  const section = root.children.find((n) => n.tagName === 'section');
  assert.ok(section, 'Section exists');
  assert.ok(section.contracts.has('pure'));
  assert.ok(section.contracts.has('deterministic'));

  const span = section.children.find((n) => n.tagName === 'span');
  assert.ok(span, 'Span exists');
  assert.ok(span.contracts.has('isolated'));

  const staticBlock = root.children.find((n) => n.tagName.toLowerCase() === '@static');
  assert.ok(staticBlock, '@static directive block exists');
  assert.ok(staticBlock.contracts.has('static'));
});
