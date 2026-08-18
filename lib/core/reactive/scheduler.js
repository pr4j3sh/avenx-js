const queue = [];
const flushCallbacks = [];
let isPending = false;
let isFlushing = false;

import { logger } from '../runtime/AvenxLogger.js';
import { AvenxErrorCodes, formatMessage } from '../runtime/AvenxError.js';

/**
 * Maximum recursive flush depth allowed before triggering reactive deadlock abort.
 * Defaults to 25 to accommodate deep legitimate multi-pass updates while stopping infinite cycles.
 * @type {number}
 */
let maxFlushCount = 25;

/**
 * Current flush iteration counter within the active microtask.
 * @type {number}
 */
let flushCycleCount = 0;

/**
 * Execution count of individual jobs in the current flush cycle.
 * Keyed by job or job.id.
 * @type {Map<any, number>}
 */
const jobExecutionCounts = new Map();

/**
 * Ordered log of jobs executed during the current flush for deadlock cycle diagnosis.
 * @type {Array<{id: any, name: string, job: Function}>}
 */
const executionHistory = [];

/**
 * Registered deadlock event callbacks.
 * @type {Set<Function>}
 */
const deadlockHandlers = new Set();

/**
 * Configures the maximum allowed flush cycle count.
 * @param {number} count - Maximum flush iterations.
 */
export function setSchedulerMaxFlushCount(count) {
  if (typeof count === 'number' && count > 0) {
    maxFlushCount = count;
  }
}

/**
 * Returns the currently configured maximum flush cycle count.
 * @returns {number}
 */
export function getSchedulerMaxFlushCount() {
  return maxFlushCount;
}

/**
 * Registers a global callback for scheduler deadlock events.
 * @param {function({cyclePath: string, jobs: Function[], boundary: any}): void} handler
 * @returns {Function} Unsubscribe function.
 */
export function onSchedulerDeadlock(handler) {
  if (typeof handler === 'function') {
    deadlockHandlers.add(handler);
    return () => deadlockHandlers.delete(handler);
  }
  return () => {};
}

/**
 * Resets the scheduler state (primarily used in testing).
 */
export function resetScheduler() {
  queue.length = 0;
  flushCallbacks.length = 0;
  isPending = false;
  isFlushing = false;
  flushCycleCount = 0;
  jobExecutionCounts.clear();
  executionHistory.length = 0;
}

/**
 * Queues a job (update callback) to be executed in the next microtask.
 * Deduplicates multiple calls to the same job.
 * @param {Function} job - The callback to run.
 */
export function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job);
    queueFlush();
  }
}

/**
 * Queues a callback to run after the current flush cycle has finished.
 * @param {Function} cb - The callback to run.
 */
export function queueFlushCallback(cb) {
  if (!flushCallbacks.includes(cb)) {
    flushCallbacks.push(cb);
    queueFlush();
  }
}

/**
 * Schedules a flush cycle in a deferred microtask.
 */
function queueFlush() {
  if (!isPending && !isFlushing) {
    isPending = true;
    Promise.resolve().then(() => {
      Promise.resolve().then(flushJobs);
    });
  }
}

/**
 * Reconstructs the circular dependency chain from the execution history.
 * @param {any} recurringId - The job ID that repeated excessively.
 * @returns {string} Formatted cycle string (e.g. "Counter -> Stats -> Counter").
 */
function extractCycleChain(recurringId) {
  const ids = executionHistory.map((item) => String(item.name || item.id || 'anonymous'));
  const targetName = String(recurringId);
  const firstIdx = ids.indexOf(targetName);

  if (firstIdx !== -1) {
    const cycleSub = ids.slice(firstIdx);
    if (!cycleSub.endsWith || cycleSub[cycleSub.length - 1] !== targetName) {
      cycleSub.push(targetName);
    }
    return cycleSub.join(' -> ');
  }

  // Fallback: take last 4 execution steps
  const recent = ids.slice(-4);
  if (recent.length > 0) {
    return recent.join(' -> ');
  }
  return String(recurringId);
}

/**
 * Handles a detected reactive deadlock: logs diagnostics, notifies handlers, and purges the queue.
 * @param {any} [triggeringJobId] - The job ID that triggered the cycle.
 */
function handleDeadlock(triggeringJobId) {
  const cycleStr = extractCycleChain(triggeringJobId || 'reactive-loop');
  const boundaryInfo = '';

  const diagnosticMsg = formatMessage(
    AvenxErrorCodes.REACTIVE_DEADLOCK_DETECTED,
    boundaryInfo,
    `  ${cycleStr}\n\nExecution aborted to prevent browser freeze.`
  );

  logger.error(diagnosticMsg);

  // Notify any registered deadlock handlers
  const eventPayload = {
    cyclePath: cycleStr,
    triggeringJobId,
    executionHistory: [...executionHistory],
  };

  for (const handler of deadlockHandlers) {
    try {
      handler(eventPayload);
    } catch (e) {
      logger.error('Error executing deadlock handler:', e);
    }
  }

  // Clear queued jobs to prevent runaway loop
  queue.length = 0;
}

/**
 * Flushes all queued jobs in a loop until the queue is completely empty.
 * Jobs are strictly ordered by their `id` property ascending (e.g. component uid)
 * to ensure parent components update before their child components.
 * After jobs are flushed, all queued flush callbacks (e.g. nextTick) are executed.
 */
function flushJobs() {
  isPending = false;
  isFlushing = true;
  
  if (flushCycleCount === 0) {
    jobExecutionCounts.clear();
    executionHistory.length = 0;
  }

  try {
    // 1. Flush jobs first
    while (queue.length > 0) {
      flushCycleCount++;

      // Guard 1: Overall flush recursion ceiling
      if (flushCycleCount > maxFlushCount) {
        handleDeadlock('MAX_FLUSH_COUNT_EXCEEDED');
        break;
      }

      // Sort jobs by their id ascending (e.g. parent uid < child uid)
      queue.sort((a, b) => (a.id || 0) - (b.id || 0));
      const job = queue.shift();
      const jobId = job.id !== undefined ? job.id : job;
      const jobName = job.name || (typeof jobId === 'string' || typeof jobId === 'number' ? `Job#${jobId}` : 'anonymous');

      // Track execution frequency per job
      const currentCount = (jobExecutionCounts.get(jobId) || 0) + 1;
      jobExecutionCounts.set(jobId, currentCount);
      executionHistory.push({ id: jobId, name: jobName, job });

      // Guard 2: Single job frequency limit (runaway individual component cycle)
      const perJobLimit = Math.min(10, maxFlushCount);
      if (currentCount > perJobLimit) {
        handleDeadlock(jobName);
        break;
      }

      try {
        job();
      } catch (error) {
        logger.error('Error executing scheduled job:', error);
      }
    }

    // 2. Flush callbacks
    const callbacks = flushCallbacks.slice();
    flushCallbacks.length = 0;
    for (const cb of callbacks) {
      try {
        cb();
      } catch (error) {
        logger.error('Error executing flush callback:', error);
      }
    }

    // 3. Re-flush if executing callbacks or jobs queued more jobs or callbacks
    if (queue.length > 0 || flushCallbacks.length > 0) {
      if (flushCycleCount <= maxFlushCount) {
        flushJobs();
      }
    }
  } finally {
    if (queue.length === 0 && flushCallbacks.length === 0) {
      isFlushing = false;
      flushCycleCount = 0;
      jobExecutionCounts.clear();
      executionHistory.length = 0;
    }
  }
}

/**
 * Executes a callback (or resolves a Promise) after all currently queued
 * jobs in the scheduler queue have finished flushing.
 * @param {Function} [callback] - Optional callback to invoke after the flush.
 * @returns {Promise<void>|void} A promise resolving after the flush, if no callback was given.
 */
export function nextTick(callback) {
  if (callback) {
    queueFlushCallback(callback);
    return;
  }

  return new Promise((resolve) => {
    queueFlushCallback(resolve);
  });
}
