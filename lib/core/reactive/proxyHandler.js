/**
 * Factory for creating proxy handlers used in reactive state.
 * Handles normal property access and computed property redirection.
 */

export const RAW_SYMBOL = Symbol('raw');

const mutatingArrayMethods = new Set([
    'push',
    'pop',
    'shift',
    'unshift',
    'splice',
    'sort',
    'reverse',
    'copyWithin',
    'fill'
]);

/**
 * Checks if the value is a candidate for reactive wrapping.
 * We restrict this to plain objects and arrays to avoid issues with
 * built-in classes (Date, RegExp, Map, Set, Promise) and custom class
 * instances that may contain private fields or internal slots.
 * 
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value should be reactive, false otherwise.
 */
export function isReactiveTarget(value) {
    if (value === null || typeof value !== 'object') {
        return false;
    }
    const proto = Object.getPrototypeOf(value);
    return proto === null || proto === Object.prototype || proto === Array.prototype;
}

// Global context for active computed evaluations
let activeComputedKey = null;
const evaluationStack = [];

// WeakMap tracking raw target to Map of keys to Set of activeComputedKeys depending on them
const depMap = new WeakMap();

// WeakMap tracking child target to { parentTarget, parentKey } relationship
const parentMap = new WeakMap();

function track(target, key) {
    if (activeComputedKey) {
        let keysMap = depMap.get(target);
        if (!keysMap) {
            keysMap = new Map();
            depMap.set(target, keysMap);
        }
        let computedKeys = keysMap.get(key);
        if (!computedKeys) {
            computedKeys = new Set();
            keysMap.set(key, computedKeys);
        }
        computedKeys.add(activeComputedKey);
    }
}

function trigger(target, key, computedDirty) {
    // 1. Trigger dependencies on the exact key
    const keysMap = depMap.get(target);
    if (keysMap) {
        const computedKeys = keysMap.get(key);
        if (computedKeys) {
            for (const computedKey of computedKeys) {
                if (!computedDirty.get(computedKey)) {
                    computedDirty.set(computedKey, true);
                    // Propagate to other computed properties depending on this one
                    trigger(target, computedKey, computedDirty);
                }
            }
        }
    }

    // 2. Propagate invalidation to parents in case target is a nested object
    const parentRelation = parentMap.get(target);
    if (parentRelation) {
        const { parentTarget, parentKey } = parentRelation;
        trigger(parentTarget, parentKey, computedDirty);
    }
}

export class ProxyHandlerFactory {
    /**
     * @param {Object} [options={}] - Configuration options.
     * @param {string[]} [options.computedKeys=[]] - List of keys that should be treated as computed properties.
     * @param {function(): void} [options.onChange=() => {}] - Callback triggered when a property is set.
     * @param {function(string, Object): any} [options.getComputedValue=() => undefined] - Function to evaluate a computed property.
     */
    constructor({
        computedKeys = [],
        onChange = () => {},
        getComputedValue = () => undefined
    } = {}) {
        /** @type {Set<string>} @private */
        this.computedKeys = new Set(computedKeys);
        /** @type {function(): void} @private */
        this.onChange = onChange;
        /** @type {function(string, Object): any} @private */
        this.getComputedValueReal = getComputedValue;
        /** @type {WeakMap<Object, Proxy>} @private */
        this.proxyCache = new WeakMap();

        // Computed property caching maps
        /** @type {Map<string, any>} @private */
        this.computedCache = new Map();
        /** @type {Map<string, boolean>} @private */
        this.computedDirty = new Map();

        // Mark all computed properties initially dirty
        for (const key of computedKeys) {
            this.computedDirty.set(key, true);
        }
    }

    /**
     * Internal helper to evaluate and cache a computed property.
     * @param {string} key
     * @param {Object} target
     * @returns {any}
     * @private
     */
    evaluateComputedCached(key, receiver) {
        const target = receiver[RAW_SYMBOL] || receiver;
        // Track the computed property itself as a dependency of whatever outer computed is evaluating
        track(target, key);

        if (this.computedCache.has(key) && !this.computedDirty.get(key)) {
            return this.computedCache.get(key);
        }

        // Push to active evaluation context stack
        evaluationStack.push(activeComputedKey);
        activeComputedKey = key;

        try {
            const val = this.getComputedValueReal(key, receiver);
            this.computedCache.set(key, val);
            this.computedDirty.set(key, false);
            return val;
        } finally {
            activeComputedKey = evaluationStack.pop();
        }
    }

    /**
     * Creates the proxy handler object.
     * @returns {ProxyHandler<Object>}
     */
    create() {
        return {
            set: (target, key, value) => this.set(target, key, value),
            get: (target, key, receiver) => this.get(target, key, receiver),
            ownKeys: target => this.ownKeys(target),
            getOwnPropertyDescriptor: (target, key) => this.getOwnPropertyDescriptor(target, key),
            deleteProperty: (target, key) => this.deleteProperty(target, key)
        };
    }

    /**
     * Proxy 'set' trap.
     * @param {Object} target - The target object.
     * @param {string|symbol} key - The property key.
     * @param {any} value - The new value.
     * @returns {boolean}
     */
    set(target, key, value) {
        if (value && value[RAW_SYMBOL]) {
            value = value[RAW_SYMBOL];
        }
        const oldValue = target[key];
        target[key] = value;

        if (isReactiveTarget(value)) {
            parentMap.set(value, { parentTarget: target, parentKey: key });
        }

        if (oldValue !== value || (Array.isArray(target) && key === 'length')) {
            trigger(target, key, this.computedDirty);
            this.onChange();
        }
        return true;
    }

    /**
     * Proxy 'get' trap.
     * Redirects to getComputedValue if the key is a computed property.
     * @param {Object} target - The target object.
     * @param {string|symbol} key - The property key.
     * @param {Object} receiver - The proxy or object inheriting from the proxy.
     * @returns {any}
     */
    get(target, key, receiver) {
        if (key === RAW_SYMBOL) {
            return target;
        }
        if (this.computedKeys.has(key)) {
            return this.evaluateComputedCached(key, receiver);
        }
        
        // Track property access
        if (typeof key !== 'symbol') {
            track(target, key);
        }

        const value = Reflect.get(target, key, receiver);
        if (typeof value === 'function') {
            if (Array.isArray(target) && mutatingArrayMethods.has(key)) {
                return (...args) => {
                    const result = target[key](...args);
                    trigger(target, 'length', this.computedDirty);
                    this.onChange();
                    return result;
                };
            }
            return value.bind(receiver);
        }
        if (isReactiveTarget(value)) {
            parentMap.set(value, { parentTarget: target, parentKey: key });
            return this.getOrCreateProxy(value);
        }
        return value;
    }

    /**
     * Proxy 'deleteProperty' trap.
     * @param {Object} target - The target object.
     * @param {string|symbol} key - The property key.
     * @returns {boolean}
     */
    deleteProperty(target, key) {
        const hasKey = Reflect.has(target, key);
        const result = Reflect.deleteProperty(target, key);
        if (hasKey) {
            trigger(target, key, this.computedDirty);
            this.onChange();
        }
        return result;
    }

    /**
     * Proxy 'ownKeys' trap.
     * Includes computed keys in the list of keys.
     * @param {Object} target - The target object.
     * @returns {Array<string|symbol>}
     */
    ownKeys(target) {
        return [...Reflect.ownKeys(target), ...this.computedKeys];
    }

    /**
     * Proxy 'getOwnPropertyDescriptor' trap.
     * Ensures computed properties appear as own properties.
     * @param {Object} target - The target object.
     * @param {string|symbol} key - The property key.
     * @returns {PropertyDescriptor|undefined}
     */
    getOwnPropertyDescriptor(target, key) {
        if (this.computedKeys.has(key)) {
            return { enumerable: true, configurable: true };
        }
        return Reflect.getOwnPropertyDescriptor(target, key);
    }

    /**
     * Returns a cached proxy or creates a new proxy for a nested object/array.
     * @param {Object|Array} val - The nested object or array.
     * @returns {Proxy} The reactive proxy.
     * @private
     */
    getOrCreateProxy(val) {
        if (this.proxyCache.has(val)) {
            return this.proxyCache.get(val);
        }
        const handler = {
            get: (target, key, receiver) => {
                if (key === RAW_SYMBOL) {
                    return target;
                }
                if (typeof key !== 'symbol') {
                    track(target, key);
                }
                const value = Reflect.get(target, key, receiver);
                if (typeof value === 'function') {
                    if (Array.isArray(target) && mutatingArrayMethods.has(key)) {
                        return (...args) => {
                            const result = target[key](...args);
                            trigger(target, 'length', this.computedDirty);
                            this.onChange();
                            return result;
                        };
                    }
                    return value.bind(receiver);
                }
                if (isReactiveTarget(value)) {
                    parentMap.set(value, { parentTarget: target, parentKey: key });
                    return this.getOrCreateProxy(value);
                }
                return value;
            },
            set: (target, key, value) => {
                if (value && value[RAW_SYMBOL]) {
                    value = value[RAW_SYMBOL];
                }
                const oldValue = target[key];
                target[key] = value;

                if (isReactiveTarget(value)) {
                    parentMap.set(value, { parentTarget: target, parentKey: key });
                }

                if (oldValue !== value || (Array.isArray(target) && key === 'length')) {
                    trigger(target, key, this.computedDirty);
                    this.onChange();
                }
                return true;
            },
            deleteProperty: (target, key) => {
                const hasKey = Reflect.has(target, key);
                const result = Reflect.deleteProperty(target, key);
                if (hasKey) {
                    trigger(target, key, this.computedDirty);
                    this.onChange();
                }
                return result;
            }
        };
        const proxy = new Proxy(val, handler);
        this.proxyCache.set(val, proxy);
        return proxy;
    }
}


