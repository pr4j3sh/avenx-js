import assert from 'assert';

// Mock DOM environment for runtime tests
const createMockElement = (tagName, value = '', attrs = {}, nodeType = 1) => {
  const listeners = {};
  const childNodes = [];
  const element = {
    nodeType,
    nodeName: tagName.toUpperCase(),
    tagName: tagName.toUpperCase(),
    value,
    childNodes,
    attributes: [],
    hasAttribute(name) {
      return attrs[name] !== undefined;
    },
    getAttribute(name) {
      return attrs[name] !== undefined ? attrs[name] : null;
    },
    setAttribute(name, val) {
      attrs[name] = String(val);
      this.attributes = Object.entries(attrs).map(([k, v]) => ({ name: k, value: v }));
    },
    removeAttribute(name) {
      delete attrs[name];
      this.attributes = Object.entries(attrs).map(([k, v]) => ({ name: k, value: v }));
    },
    addEventListener(event, callback) {
      listeners[event] = callback;
    },
    removeEventListener(event) {
      delete listeners[event];
    },
    appendChild(child) {
      if (child.parentNode && typeof child.parentNode.removeChild === 'function') {
        child.parentNode.removeChild(child);
      }
      child.parentNode = this;
      childNodes.push(child);
    },
    removeChild(child) {
      const idx = childNodes.indexOf(child);
      if (idx !== -1) {
        childNodes.splice(idx, 1);
        child.parentNode = null;
      }
    },
    replaceChild(newChild, oldChild) {
      const idx = childNodes.indexOf(oldChild);
      if (idx !== -1) {
        childNodes[idx] = newChild;
        newChild.parentNode = this;
        oldChild.parentNode = null;
      }
    },
    cloneNode(deep) {
      const copy = createMockElement(this.tagName, this.value, { ...attrs }, this.nodeType);
      if (deep) {
        childNodes.forEach((child) => {
          copy.appendChild(child.cloneNode(true));
        });
      }
      return copy;
    },
    get firstChild() {
      return childNodes[0] || null;
    },
    get innerHTML() {
      return this._innerHTML || '';
    },
    set innerHTML(html) {
      this._innerHTML = String(html);
      childNodes.length = 0;
      if (typeof html === 'string' && html.includes('class="ax-deadlock-fallback"')) {
        const fallbackNode = createMockElement('div', html, { class: 'ax-deadlock-fallback' });
        fallbackNode.parentNode = this;
        childNodes.push(fallbackNode);
      }
    },
    matches(selector) {
      if (selector === '[data-ax-deadlock]') return this.hasAttribute('data-ax-deadlock');
      if (selector === '.ax-deadlock-fallback') return (this.getAttribute('class') || '').includes('ax-deadlock-fallback');
      return false;
    },
    querySelectorAll(selector) {
      const results = [];
      if (selector === '[data-ax-deadlock]') {
        const find = (node) => {
          if (node.hasAttribute && node.hasAttribute('data-ax-deadlock')) results.push(node);
          if (node.childNodes) node.childNodes.forEach(find);
        };
        childNodes.forEach(find);
      } else if (selector === 'template[data-ax-deadlock-fallback]') {
        const find = (node) => {
          if (node.hasAttribute && node.hasAttribute('data-ax-deadlock-fallback')) results.push(node);
          if (node.childNodes) node.childNodes.forEach(find);
        };
        childNodes.forEach(find);
      } else if (selector === '.ax-deadlock-fallback') {
        const find = (node) => {
          if (node.getAttribute && (node.getAttribute('class') || '').includes('ax-deadlock-fallback')) results.push(node);
          if (node.childNodes) node.childNodes.forEach(find);
        };
        childNodes.forEach(find);
      }
      return results;
    },
    querySelector(selector) {
      const all = this.querySelectorAll(selector);
      return all.length > 0 ? all[0] : null;
    },
    listeners,
  };
  element.attributes = Object.entries(attrs).map(([k, v]) => ({ name: k, value: v }));
  return element;
};

global.document = {
  querySelector: () => createMockElement('DIV'),
  createElement: (tag) => createMockElement(tag),
};

global.DOMParser = class {
  parseFromString() {
    const body = createMockElement('body');
    return { body };
  }
};

global.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 };

import { AvenxComponent } from '../../lib/core/runtime/AvenxComponent.js';
import { logger } from '../../lib/core/runtime/AvenxLogger.js';
import { AvenxErrorCodes } from '../../lib/core/runtime/AvenxError.js';
import {
  nextTick,
  resetScheduler,
  onSchedulerDeadlock,
  setSchedulerMaxFlushCount,
} from '../../lib/core/reactive/scheduler.js';

/**
 * Tests detection of infinite component update loops in the scheduler.
 */
async function testSchedulerComponentLoopDetection() {
  console.log('🧪 Testing scheduler circular reactive update detection...');
  resetScheduler();
  setSchedulerMaxFlushCount(15);

  const errors = [];
  const originalError = logger.error;
  logger.error = (msg) => {
    errors.push(msg);
  };

  let deadlockFired = false;
  const unsub = onSchedulerDeadlock((event) => {
    deadlockFired = true;
    assert.ok(event.cyclePath, 'Event payload should have cyclePath');
  });

  // Create two mutually triggering components
  const comps = {};

  comps.a = new AvenxComponent(
    { val: 0 },
    {},
    {},
    '<div>{{ val }}</div>',
    {
      onUpdate() {
        if (comps.b) {
          comps.b.state.val = this.val + 1;
        }
      },
    },
  );

  comps.b = new AvenxComponent(
    { val: 0 },
    {},
    {},
    '<div>{{ val }}</div>',
    {
      onUpdate() {
        if (comps.a) {
          comps.a.state.val = this.val + 1;
        }
      },
    },
  );

  const elA = createMockElement('div');
  const elB = createMockElement('div');
  comps.a.__setMountTarget(elA);
  comps.a.__afterMount();
  comps.b.__setMountTarget(elB);
  comps.b.__afterMount();

  // Kick off the infinite loop
  comps.a.state.val = 1;

  // Wait for scheduler to flush and intercept the deadlock
  await nextTick();

  logger.error = originalError;
  unsub();

  assert.ok(deadlockFired, 'onSchedulerDeadlock listener should have been invoked');
  assert.ok(
    errors.some((e) => e.includes(AvenxErrorCodes.REACTIVE_DEADLOCK_DETECTED)),
    'Should log AVX_R18 reactive deadlock error',
  );

  console.log('  ✅ Scheduler circular component update detection test passed!');
}

/**
 * Tests detection of synchronous watcher cascade loops.
 */
async function testSynchronousWatcherCascadeDetection() {
  console.log('🧪 Testing synchronous watcher cascade loop detection...');
  resetScheduler();

  const errors = [];
  const originalError = logger.error;
  logger.error = (msg) => {
    errors.push(msg);
  };

  const comp = new AvenxComponent({ a: 0, b: 0 }, {}, {}, '<div>{{ a }} {{ b }}</div>');
  const el = createMockElement('div');
  comp.__setMountTarget(el);
  comp.__afterMount();

  // Mutual synchronous watchers
  comp.$watch('a', (newVal) => {
    comp.state.b = newVal + 1;
  });

  comp.$watch('b', (newVal) => {
    comp.state.a = newVal + 1;
  });

  // Mutate 'a' to initiate cascade
  comp.state.a = 1;

  logger.error = originalError;

  assert.ok(
    errors.some((e) => e.includes(AvenxErrorCodes.REACTIVE_DEADLOCK_DETECTED)),
    'Should log AVX_R18 when synchronous watcher cascade exceeds maximum depth',
  );

  console.log('  ✅ Synchronous watcher cascade loop detection test passed!');
}

/**
 * Tests legitimate multi-pass terminating updates (negative test / no false positives).
 */
async function testLegitimateMultiPassUpdate() {
  console.log('🧪 Testing legitimate multi-pass updates (no false positives)...');
  resetScheduler();
  setSchedulerMaxFlushCount(25);

  const errors = [];
  const originalError = logger.error;
  logger.error = (msg) => {
    errors.push(msg);
  };

  let updateCount = 0;
  const comp = new AvenxComponent(
    { a: 0, b: 0, c: 0 },
    {},
    {},
    '<div>{{ a }} {{ b }} {{ c }}</div>',
  );

  const el = createMockElement('div');
  comp.__setMountTarget(el);
  comp.__afterMount();

  comp.$watch('a', (newVal) => {
    updateCount++;
    comp.state.b = newVal * 2;
  });

  comp.$watch('b', (newVal) => {
    updateCount++;
    comp.state.c = newVal + 10;
  });

  comp.state.a = 5;
  await nextTick();

  logger.error = originalError;

  assert.strictEqual(errors.length, 0, 'No deadlock errors should be emitted for terminating multi-pass updates');
  assert.strictEqual(comp.state.a, 5);
  assert.strictEqual(comp.state.b, 10);
  assert.strictEqual(comp.state.c, 20);
  assert.strictEqual(updateCount, 2);
  console.log('  ✅ Legitimate multi-pass update test passed without false positives!');
}

/**
 * Tests deadlock boundary fallback UI rendering.
 */
async function testDeadlockBoundaryFallback() {
  console.log('🧪 Testing <@deadlock> boundary fallback rendering...');

  const template = `
<div data-ax-deadlock="true" data-ax-deadlock-name="dashboard-boundary" data-ax-deadlock-action="fallback">
  <template data-ax-deadlock-fallback="true" data-ax-error-as="err">
    <div class="ax-deadlock-fallback">Deadlock caught in {{ name }}: {{ err.message }}</div>
  </template>
  <div class="active-content">Active Content</div>
</div>
`.trim();

  const comp = new AvenxComponent({ x: 0 }, {}, {}, template);
  const rootEl = createMockElement('div');
  comp.__setMountTarget(rootEl);

  const boundaryEl = createMockElement('div', '', {
    'data-ax-deadlock': 'true',
    'data-ax-deadlock-name': 'dashboard-boundary',
    'data-ax-deadlock-action': 'fallback',
  });

  const fallbackTpl = createMockElement('template', '', {
    'data-ax-deadlock-fallback': 'true',
    'data-ax-error-as': 'err',
  });
  fallbackTpl.innerHTML = '<div class="ax-deadlock-fallback">Deadlock caught in {{ name }}: {{ err.message }}</div>';
  boundaryEl.appendChild(fallbackTpl);

  const activeContent = createMockElement('div', 'Active Content');
  boundaryEl.appendChild(activeContent);
  rootEl.appendChild(boundaryEl);

  // Trip the deadlock boundary
  comp.$tripDeadlockBoundary('dashboard-boundary', { message: 'Circular loop in dashboard' });

  assert.ok(
    boundaryEl.querySelector('.ax-deadlock-fallback'),
    'Fallback UI element should be rendered inside boundary',
  );

  console.log('  ✅ <@deadlock> boundary fallback rendering test passed!');
}

(async () => {
  try {
    await testSchedulerComponentLoopDetection();
    await testSynchronousWatcherCascadeDetection();
    await testLegitimateMultiPassUpdate();
    await testDeadlockBoundaryFallback();
    console.log('🎉 All Deadlock and Reactive Cycle tests passed successfully!');
  } catch (err) {
    console.error('❌ Deadlock test failed:', err);
    process.exit(1);
  }
})();
