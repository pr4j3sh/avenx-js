import test from 'node:test';
import assert from 'node:assert/strict';
import { AvenxComponent } from '../../lib/core/runtime/AvenxComponent.js';

test('Isolated component does not receive external bridges in its scope or instance', () => {
  const dummyBridges = {
    globalStore: { token: 'secret-123' },
    themeStore: { theme: 'dark' },
  };

  // 1. Regular non-isolated component
  const regularComp = new AvenxComponent(
    { count: 1 },
    {},
    dummyBridges,
    '<div>{{ count }}</div>',
    {},
    { title: 'Normal' },
    {},
    {}
  );
  assert.equal(regularComp._getBridges().globalStore.token, 'secret-123');
  assert.equal(regularComp.contracts.has('isolated'), false);

  // 2. Isolated component
  const isolatedComp = new AvenxComponent(
    { count: 1 },
    {},
    dummyBridges,
    '<div>{{ props.title }}</div>',
    {},
    { title: 'IsolatedTitle' },
    {},
    {},
    { contracts: ['isolated'] }
  );

  assert.equal(isolatedComp.contracts.has('isolated'), true);
  // Bridges should be empty / isolated
  assert.deepEqual(isolatedComp._getBridges(), {});
});
