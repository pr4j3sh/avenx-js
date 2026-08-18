import test from 'node:test';
import assert from 'node:assert/strict';
import ComponentParser from '../../lib/compiler/ComponentParser.js';
import StyleProcessor from '../../lib/compiler/StyleProcessor.js';
import { DomPatcher } from '../../lib/core/renderer/domPatch.js';
import { MockDOMElement, setupDOMMock, teardownDOMMock } from '../helpers/dom-mock.js';

test('Pure + Deterministic nodes receive data-ax-memo in compilation', () => {
  const sp = new StyleProcessor();
  const cp = new ComponentParser(sp);

  const tpl = `
    <div class="dashboard">
      <div pure deterministic class="stat-box">
        <span>{{ props.totalCount }}</span>
      </div>
      <div class="live-feed">
        <p>{{ liveUpdates }}</p>
      </div>
    </div>
  `;

  const optimized = cp.optimizeStaticSubtrees(tpl);

  assert.ok(optimized.includes('class="stat-box" data-ax-memo="true"'));
  assert.ok(!optimized.includes('class="stat-box" static'));
  assert.ok(!optimized.includes('class="live-feed" data-ax-memo'));
});

test('DomPatcher skips subtree diffing when data-ax-memo element is equal', () => {
  setupDOMMock();
  try {
    const patcher = new DomPatcher();

    const target = new MockDOMElement('div');
    const html = '<div data-ax-memo="true"><span>Initial Static Data</span></div>';

    // 1. Initial render
    patcher.patch(target, html);
    const initialMemoNode = target.childNodes[0];
    const initialSpanNode = initialMemoNode.childNodes[0];

    // 2. Patch with identical memoized subtree
    patcher.patch(target, html);

    // Assert that the child span node reference was preserved
    assert.equal(target.childNodes[0], initialMemoNode);
    assert.equal(target.childNodes[0].childNodes[0], initialSpanNode);
  } finally {
    teardownDOMMock();
  }
});
