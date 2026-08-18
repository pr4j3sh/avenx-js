import assert from 'assert';

import { AvenxApp } from '../../lib/core/runtime/AvenxApp.js';
import { AvenxPage } from '../../lib/core/runtime/AvenxPage.js';
import { AvenxGuard } from '../../lib/core/runtime/AvenxGuard.js';
import { setupDOMMock, teardownDOMMock } from '../helpers/dom-mock.js';

class PageHome extends AvenxPage {
  render() {
    return '<div>Home Page</div>';
  }
}

class PageProfile extends AvenxPage {
  render() {
    return '<div>Profile Page</div>';
  }
}

class MockGuard extends AvenxGuard {
  canActivate() {
    return true;
  }
}

let hashListeners = [];

function setupWindowMock() {
  hashListeners = [];
  global.window = {
    addEventListener: (event, cb) => {
      if (event === 'hashchange') {
        hashListeners.push(cb);
      }
    },
    removeEventListener: (event, cb) => {
      if (event === 'hashchange') {
        hashListeners = hashListeners.filter((l) => l !== cb);
      }
    },
    location: {
      _hash: '',
      get hash() {
        return this._hash;
      },
      set hash(val) {
        this._hash = val;
        hashListeners.forEach((listener) => listener());
      },
    },
  };
}

function teardownWindowMock() {
  delete global.window;
}

async function testGetRoutesExists() {
  console.log('🧪 Testing getRoutes() exists and is callable...');
  setupDOMMock();
  setupWindowMock();

  const app = new AvenxApp({ target: 'div' });
  app.registerPage('Home', PageHome);
  app.registerPage('Profile', PageProfile);

  const router = app.initRouter({
    '#/': 'Home',
    '#/profile': 'Profile',
  });

  await new Promise((r) => setTimeout(r, 0));

  assert.strictEqual(typeof router.getRoutes, 'function', 'getRoutes should be a function');

  router.destroy();
  teardownWindowMock();
  teardownDOMMock();
  console.log('  ✅ getRoutes exists test passed!');
}

async function testGetRoutesReturnsRegisteredRoutes() {
  console.log('🧪 Testing getRoutes() returns registered routes...');
  setupDOMMock();
  setupWindowMock();

  const app = new AvenxApp({ target: 'div' });
  app.registerPage('Home', PageHome);
  app.registerPage('Profile', PageProfile);

  const router = app.initRouter({
    '#/': 'Home',
    '#/profile': 'Profile',
    '#/user/:id': {
      page: 'User',
      guards: [MockGuard],
    },
  });

  await new Promise((r) => setTimeout(r, 0));

  const routes = router.getRoutes();
  assert.strictEqual(Array.isArray(routes), true, 'getRoutes should return an array');
  assert.strictEqual(routes.length, 3, 'Should return 3 routes');

  const patterns = routes.map((r) => r.pattern);
  assert.ok(patterns.includes('#/'), 'Should include home route');
  assert.ok(patterns.includes('#/profile'), 'Should include profile route');
  assert.ok(patterns.includes('#/user/:id'), 'Should include dynamic route');

  router.destroy();
  teardownWindowMock();
  teardownDOMMock();
  console.log('  ✅ getRoutes returns registered routes test passed!');
}

async function testGetRoutesReturnsNewArray() {
  console.log('🧪 Testing getRoutes() returns a new array...');
  setupDOMMock();
  setupWindowMock();

  const app = new AvenxApp({ target: 'div' });
  app.registerPage('Home', PageHome);

  const router = app.initRouter({
    '#/': 'Home',
    '#/profile': 'Profile',
  });

  await new Promise((r) => setTimeout(r, 0));

  const routes1 = router.getRoutes();
  const routes2 = router.getRoutes();

  assert.notStrictEqual(routes1, routes2, 'Each call should return a new array');

  routes1.push({ pattern: '#/hacked', definition: 'Home' });
  const routes3 = router.getRoutes();
  assert.strictEqual(routes3.length, 2, 'Mutating returned array should not affect router');

  router.destroy();
  teardownWindowMock();
  teardownDOMMock();
  console.log('  ✅ getRoutes returns new array test passed!');
}

async function testGetRoutesMutationIsolation() {
  console.log('🧪 Testing getRoutes() mutation isolation...');
  setupDOMMock();
  setupWindowMock();

  const app = new AvenxApp({ target: 'div' });
  app.registerPage('Home', PageHome);

  const router = app.initRouter({
    '#/': 'Home',
    '#/profile': {
      page: 'Profile',
      guards: [MockGuard],
    },
  });

  await new Promise((r) => setTimeout(r, 0));

  const routes = router.getRoutes();

  const profileRoute = routes.find((r) => r.pattern === '#/profile');
  assert.ok(profileRoute, 'Profile route should exist');
  assert.ok(typeof profileRoute.definition === 'object', 'Definition should be an object');

  profileRoute.definition.page = 'Hacked';
  profileRoute.definition.guards = [];

  const routesAfter = router.getRoutes();
  const profileRouteAfter = routesAfter.find((r) => r.pattern === '#/profile');
  assert.strictEqual(
    profileRouteAfter.definition.page,
    'Profile',
    'Mutating returned route definition should not affect router',
  );
  assert.ok(
    Array.isArray(profileRouteAfter.definition.guards) && profileRouteAfter.definition.guards.length > 0,
    'Mutating returned route guards should not affect router',
  );

  router.destroy();
  teardownWindowMock();
  teardownDOMMock();
  console.log('  ✅ getRoutes mutation isolation test passed!');
}

async function testGetRoutesPreservesStructure() {
  console.log('🧪 Testing getRoutes() preserves route object structure...');
  setupDOMMock();
  setupWindowMock();

  const app = new AvenxApp({ target: 'div' });
  app.registerPage('Home', PageHome);
  app.registerPage('Profile', PageProfile);

  const router = app.initRouter({
    '#/': 'Home',
    '#/profile': 'Profile',
    '#/user/:id': {
      page: 'User',
      guards: [MockGuard],
    },
  });

  await new Promise((r) => setTimeout(r, 0));

  const routes = router.getRoutes();

  const homeRoute = routes.find((r) => r.pattern === '#/');
  assert.strictEqual(homeRoute.definition, 'Home', 'String definition should be preserved');

  const profileRoute = routes.find((r) => r.pattern === '#/profile');
  assert.strictEqual(profileRoute.definition, 'Profile', 'String definition should be preserved');

  const userRoute = routes.find((r) => r.pattern === '#/user/:id');
  assert.ok(typeof userRoute.definition === 'object', 'Object definition should be preserved');
  assert.strictEqual(userRoute.definition.page, 'User', 'Object page property should be preserved');
  assert.ok(Array.isArray(userRoute.definition.guards), 'Object guards property should be preserved');

  router.destroy();
  teardownWindowMock();
  teardownDOMMock();
  console.log('  ✅ getRoutes preserves structure test passed!');
}

async function testGetRoutesDoesNotBreakNavigation() {
  console.log('🧪 Testing getRoutes() does not break navigation...');
  setupDOMMock();
  setupWindowMock();

  const app = new AvenxApp({ target: 'div' });
  app.registerPage('Home', PageHome);
  app.registerPage('Profile', PageProfile);

  const router = app.initRouter({
    '#/': 'Home',
    '#/profile': 'Profile',
  });

  await new Promise((r) => setTimeout(r, 0));

  window.location.hash = '#/profile';
  await new Promise((r) => setTimeout(r, 0));

  assert.strictEqual(router.currentRoute.page, 'Profile', 'Navigation should still work after getRoutes');

  const routes = router.getRoutes();
  assert.strictEqual(routes.length, 2, 'Routes should still be accessible after navigation');

  window.location.hash = '#/';
  await new Promise((r) => setTimeout(r, 0));

  assert.strictEqual(router.currentRoute.page, 'Home', 'Navigation back should still work');

  router.destroy();
  teardownWindowMock();
  teardownDOMMock();
  console.log('  ✅ getRoutes does not break navigation test passed!');
}

(async () => {
  try {
    await testGetRoutesExists();
    await testGetRoutesReturnsRegisteredRoutes();
    await testGetRoutesReturnsNewArray();
    await testGetRoutesMutationIsolation();
    await testGetRoutesPreservesStructure();
    await testGetRoutesDoesNotBreakNavigation();
    console.log('🎉 All getRoutes tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ getRoutes tests failed!');
    console.error(error);
    process.exit(1);
  }
})();
