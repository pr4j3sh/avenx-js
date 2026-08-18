import assert from 'assert';
import { AvenxLogger, defaultFormatter, formatContextTag } from '../../lib/core/runtime/AvenxLogger.js';

function testLoggerLevels() {
  console.log('🧪 Testing AvenxLogger Levels and Priorities...');

  const logs = [];
  const testTransport = {
    log(level, formattedArgs) {
      logs.push({ level, message: formattedArgs[0] });
    },
  };

  const logger = new AvenxLogger({
    level: 'info',
    formatter: (level, args) => args,
    transports: [testTransport],
  });

  // Verify info suppresses debug/trace
  logger.trace('should not log trace');
  logger.debug('should not log debug');
  logger.info('should log info');
  logger.log('should log info via log alias');
  logger.warn('should log warn');
  logger.error('should log error');
  logger.fatal('should log fatal');

  assert.strictEqual(logs.length, 5);
  assert.deepStrictEqual(logs, [
    { level: 'info', message: 'should log info' },
    { level: 'info', message: 'should log info via log alias' },
    { level: 'warn', message: 'should log warn' },
    { level: 'error', message: 'should log error' },
    { level: 'fatal', message: 'should log fatal' },
  ]);

  console.log('  ✅ Logger Levels and Priorities tests passed!');
}

function testLoggerSilencing() {
  console.log('🧪 Testing AvenxLogger Silencing (silent/off)...');

  const logs = [];
  const testTransport = {
    log(level, formattedArgs) {
      logs.push({ level, message: formattedArgs[0] });
    },
  };

  const logger = new AvenxLogger({
    level: 'silent',
    formatter: (level, args) => args,
    transports: [testTransport],
  });

  logger.fatal('should not log');
  logger.error('should not log');

  assert.strictEqual(logs.length, 0);

  logger.configure({ level: 'off' });
  logger.fatal('should not log either');
  assert.strictEqual(logs.length, 0);

  logger.configure({ level: 'info', silent: true });
  logger.fatal('should not log with silent: true');
  assert.strictEqual(logs.length, 0);

  console.log('  ✅ Logger Silencing tests passed!');
}

function testLoggerCustomFormatter() {
  console.log('🧪 Testing AvenxLogger Custom Formatter...');

  const logs = [];
  const testTransport = {
    log(level, formattedArgs) {
      logs.push(formattedArgs[0]);
    },
  };

  const logger = new AvenxLogger({
    level: 'debug',
    formatter: (level, args) => [`[TEST-${level.toUpperCase()}] ${args[0]}`],
    transports: [testTransport],
  });

  logger.debug('hello');
  assert.strictEqual(logs[0], '[TEST-DEBUG] hello');

  console.log('  ✅ Logger Custom Formatter tests passed!');
}

function testLoggerCustomTransports() {
  console.log('🧪 Testing AvenxLogger Custom Transports...');

  const logs1 = [];
  const logs2 = [];

  const transport1 = (level, formatted) => logs1.push(formatted[0]);
  const transport2 = {
    log: (level, formatted) => logs2.push(formatted[0]),
  };

  const logger = new AvenxLogger({
    level: 'info',
    formatter: (level, args) => args,
    transports: [transport1, transport2],
  });

  logger.info('broadcast');
  assert.strictEqual(logs1[0], 'broadcast');
  assert.strictEqual(logs2[0], 'broadcast');

  console.log('  ✅ Logger Custom Transports tests passed!');
}

function testDefaultFormatter() {
  console.log('🧪 Testing defaultFormatter...');

  const formattedStr = defaultFormatter('info', ['hello', { details: 1 }]);
  assert.strictEqual(formattedStr[0], '[Avenx info] hello');
  assert.deepStrictEqual(formattedStr[1], { details: 1 });

  const formattedObj = defaultFormatter('warn', [{ details: 1 }]);
  assert.strictEqual(formattedObj[0], '[Avenx warn]');
  assert.deepStrictEqual(formattedObj[1], { details: 1 });

  console.log('  ✅ defaultFormatter tests passed!');
}

function testContextAnnotations() {
  console.log('🧪 Testing Component Context Annotations in AvenxLogger...');

  // Test formatContextTag helper directly
  assert.strictEqual(
    formatContextTag({ componentName: 'UserCard', fileName: 'src/components/user-card.component.js' }),
    '[UserCard <src/components/user-card.component.js>]'
  );
  assert.strictEqual(formatContextTag({ componentName: 'UserCard' }), '[UserCard]');
  assert.strictEqual(formatContextTag({ fileName: 'src/components/user-card.component.js' }), '[<src/components/user-card.component.js>]');
  assert.strictEqual(formatContextTag(null), '');

  // Test defaultFormatter with component context
  const formattedContext = defaultFormatter('warn', [
    '[AVX_W05] Invalid prop type for "count". Expected Number, got String.',
    { componentName: 'UserCard', fileName: 'src/components/user-card.component.js' },
  ]);
  assert.strictEqual(
    formattedContext[0],
    '[Avenx warn] [UserCard <src/components/user-card.component.js>] [AVX_W05] Invalid prop type for "count". Expected Number, got String.'
  );

  // Test defaultFormatter with componentName only
  const formattedCompOnly = defaultFormatter('error', [
    'Lifecycle hook error',
    { componentName: 'UserCard' },
  ]);
  assert.strictEqual(formattedCompOnly[0], '[Avenx error] [UserCard] Lifecycle hook error');

  // Verify non-context objects are preserved as raw arguments
  const formattedDataObj = defaultFormatter('info', ['Data payload', { count: 42 }]);
  assert.strictEqual(formattedDataObj[0], '[Avenx info] Data payload');
  assert.deepStrictEqual(formattedDataObj[1], { count: 42 });

  console.log('  ✅ Component Context Annotations tests passed!');
}

function testChildMethod() {
  console.log('🧪 Testing AvenxLogger.child()...');

  const logs = [];
  const testTransport = {
    log(level, formattedArgs) {
      logs.push({ level, message: formattedArgs[0] });
    },
  };

  const parent = new AvenxLogger({
    level: 'info',
    formatter: defaultFormatter,
    transports: [testTransport],
  });

  // String shorthand
  logs.length = 0;
  const authLogger = parent.child('[AuthBridge]');
  authLogger.info('User logged in');
  assert.strictEqual(logs.length, 1);
  assert.ok(logs[0].message.startsWith('[AuthBridge]'), `Expected prefix [AuthBridge], got: ${logs[0].message}`);

  // Object prefix
  logs.length = 0;
  const dbLogger = parent.child({ prefix: '[DB]' });
  dbLogger.info('Query executed');
  assert.ok(logs[0].message.startsWith('[DB]'), `Expected prefix [DB], got: ${logs[0].message}`);

  // ComponentName context
  logs.length = 0;
  const ctxLogger = parent.child({ componentName: 'AuthBridge' });
  ctxLogger.info('Authenticated');
  assert.ok(logs[0].message.includes('[AuthBridge]'), `Expected context tag [AuthBridge], got: ${logs[0].message}`);

  // Prefix + componentName
  logs.length = 0;
  const fullLogger = parent.child({ prefix: '[SYS]', componentName: 'AuthService' });
  fullLogger.warn('Token expiring');
  assert.ok(logs[0].message.startsWith('[SYS]'), `Expected prefix [SYS], got: ${logs[0].message}`);
  assert.ok(logs[0].message.includes('[AuthService]'), `Expected context [AuthService], got: ${logs[0].message}`);

  // Child inherits parent log level
  logs.length = 0;
  const warnParent = new AvenxLogger({
    level: 'warn',
    formatter: defaultFormatter,
    transports: [testTransport],
  });
  const childOfWarn = warnParent.child('[Child]');
  childOfWarn.info('should not appear');
  childOfWarn.warn('should appear');
  assert.strictEqual(logs.length, 1);
  assert.ok(logs[0].message.startsWith('[Child]'));

  // Child config is independent
  logs.length = 0;
  childOfWarn.setLevel('trace');
  childOfWarn.trace('child sees trace');
  assert.strictEqual(logs.length, 1, 'Child should log trace after setLevel');
  logs.length = 0;
  warnParent.trace('parent should not see trace');
  assert.strictEqual(logs.length, 0, 'Parent should not be affected by child setLevel');

  // Nested children merge bindings
  logs.length = 0;
  const level1 = parent.child('[A]');
  const level2 = level1.child('[B]');
  level2.info('nested');
  assert.ok(logs[0].message.includes('[A]') && logs[0].message.includes('[B]'), `Expected both prefixes [A] and [B], got: ${logs[0].message}`);

  // Child inherits parent transports
  logs.length = 0;
  parent.info('parent msg');
  authLogger.info('child msg');
  assert.strictEqual(logs.length, 2);
  assert.ok(logs[0].message.includes('[Avenx info]'));
  assert.ok(logs[1].message.startsWith('[AuthBridge]'));

  // Existing context in args is not overridden by componentName binding
  logs.length = 0;
  const compLogger = parent.child({ componentName: 'ChildComp' });
  compLogger.info('msg', { componentName: 'ExplicitComp' });
  assert.ok(logs[0].message.includes('[ExplicitComp]'), 'Explicit context should take precedence over binding');
  assert.ok(!logs[0].message.includes('[ChildComp]'), 'Bound componentName should not appear when explicit context provided');

  console.log('  ✅ child() method tests passed!');
}

(function runAllLoggerTests() {
  console.log('\n======================================');
  console.log('🏃 Running Logger Unit Tests');
  console.log('======================================');
  testLoggerLevels();
  testLoggerSilencing();
  testLoggerCustomFormatter();
  testLoggerCustomTransports();
  testDefaultFormatter();
  testContextAnnotations();
  testChildMethod();
  console.log('======================================\n');
})();
