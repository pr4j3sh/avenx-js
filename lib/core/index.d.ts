// Type definitions for Avenx-JS core runtime
// Project: Avenx-JS
// Definitions by: Avenx Team

/**
 * Base class for all route guards in Avenx.
 */

export interface GuardControlObject {
    cancel?: boolean;
    silent?: boolean;
    redirect?: string;
    state?: Record<string, any>;
}

export type GuardResult =
    | boolean
    | string
    | GuardControlObject
    | Promise<boolean | string | GuardControlObject>;
export class AvenxGuard {
    /**
     * Determines whether the route can be activated.
     * Can return a boolean, a redirect string, control object,
     * or a Promise resolving to either.
     * @param to Target route information.
     * @param from Current route information.
     */
    canActivate(
        to: { hash: string; page: string; params: Record<string, any> },
        from: { hash: string; page: string; params: Record<string, any> } | null
    ): GuardResult;
    canDeactivate?(
        current: { hash: string; page: string; params: Record<string, any> },
        next: { hash: string; page: string; params: Record<string, any> }
    ): boolean | Promise<boolean>;
}

/**
 * Base class for all Avenx components.
 * Manages state, reactivity, rendering, and lifecycle.
 */
export class AvenxComponent<S extends Record<string, any> = Record<string, any>> {
    /**
     * The reactive state proxy of the component.
     * When a generic state shape `S` is provided, this property is fully typed.
     */
    state: S;

    /**
     * The reactive props of the component.
     */
    props: Record<string, any>;

    /**
     * The component instance that mounted this component, or null for root components.
     */
    readonly $parent: AvenxComponent<any> | null;

    /**
     * Template refs collected from `data-ax-ref` markers.
     * Resolves to a component instance when the host element has `__avenx_comp_instance`, otherwise the DOM element.
     */
    readonly $refs: Record<string, Element | AvenxComponent<any> | undefined>;

    /**
     * Helpers for inspecting whether the parent provided slot content.
     */
    readonly $slots: {
        /**
         * Returns true when content was provided for the named slot (or the default slot).
         * @param slotName Named slot, or `default` / omitted for the default slot.
         */
        has(slotName?: string): boolean;
    };

    /**
     * Programmatically clear cached KeepAlive component instances.
     */
    readonly $keepAlive: {
        clear(componentName?: string): boolean;
    };

    /**
     * Helper method to clear cached KeepAlive component instances.
     * @param pageName Optional component or page name to clear from cache.
     */
    clearKeepAliveCache(pageName?: string): boolean;

    /**
     * The active route details.
     */
    readonly $route: { hash: string; page: string; params: Record<string, any> };

    /**
     * Runs after the current reactive DOM update flush completes.
     * With a callback, invokes it after the flush. Without a callback, returns a Promise.
     */
    $nextTick(callback: () => void): void;
    $nextTick(): Promise<void>;

    /**
     * Alias for {@link AvenxComponent#$nextTick}.
     */
    nextTick(callback: () => void): void;
    nextTick(): Promise<void>;

    /**
     * Keys or mappings to share reactively with descendant components.
     */
    provide?: Record<string, any> | (() => Record<string, any>) | string[];

    /**
     * Keys or mappings injected from ancestor components.
     */
    inject?: Record<string, string> | (() => Record<string, string>) | string[];

    /**
     * @param initialState Initial component state variables.
     * @param computed Map of computed properties to their expression strings.
     * @param bridges Global reactive bridges injected into this component.
     * @param template Compiled HTML template string.
     * @param methods Component action methods.
     * @param props Input properties passed down from parent.
     */
    constructor(
        initialState?: S,
        computed?: Record<string, string>,
        bridges?: Record<string, any>,
        template?: string,
        methods?: Record<string, string | Function>,
        props?: Record<string, any>
    );

    /**
     * Renders the component HTML template using current state.
     */
    render(): string;

    /**
     * Patches the DOM to update the component UI.
     */
    update(): void;

    /**
     * Mounts the component to a target DOM node or selector.
     * @param target Target element or selector string.
     */
    mount(target: Element | string): void;

    /**
     * Unmounts the component from the DOM and runs lifecycle cleanup.
     */
    unmount(): void | Promise<void>;

    /**
     * Called before the component leaves the DOM. Can return a Promise to delay DOM removal.
     */
    onBeforeLeave?(): void | Promise<void>;

    /**
     * Called when the component is mounted and enters the DOM.
     */
    onEnter?(): void;

    /**
     * Called when the component leaves the DOM and unmounts.
     */
    onLeave?(): void;

    /**
     * Updates the component's props and triggers an update if they changed.
     * @param newProps The new props to apply.
     */
    setProps(newProps: Record<string, any>): void;

    /**
     * Component mount lifecycle hook (action).
     */
    onMount?(): void;

    /**
     * Component update lifecycle hook (action).
     */
    onUpdate?(): void;

    /**
     * Component before update lifecycle hook (action).
     */
    onBeforeUpdate?(): void;

    /**
     * Component unmount lifecycle hook (action).
     */
    onUnmount?(): void;

    /**
     * Component activated from keep-alive cache hook.
     */
    onActivate?(params?: Record<string, any>): void;

    /**
     * Component deactivated/cached hook.
     */
    onDeactivate?(): void;

    /**
     * Programmatically registers a watcher on a reactive expression/function.
     * @param getter Evaluation function returning value to watch.
     * @param callback Triggers when the value changes.
     * @param options Config options.
     */
    watch(
        getter: () => any,
        callback: (newValue: any, oldValue: any) => void,
        options?: { immediate?: boolean; lazy?: boolean; deep?: boolean; debounce?: number; throttle?: number }
    ): AvenxWatcher;

    /**
     * Evaluates validation rules for an element and updates state.$validation.
     * @param el Element to validate.
     */
    $validateElement(el: Element): string[];

    /**
     * Internal method to set mount target element.
     * @param target
     * @private
     */
    __setMountTarget(target: Element): void;

    /**
     * Internal lifecycle callback after mount is completed.
     * @private
     */
    __afterMount(): void;

    /**
     * Retrieves the component root element.
     * @protected
     */
    _getElement(): Element | null;

    /**
     * Retrieves bridges available to the component.
     * @protected
     */
    _getBridges(): Record<string, any>;

    /**
     * Retrieves the transcluded groups for this component.
     * @protected
     */
    _getTranscludedGroups(): Record<string, any>;
}

/**
 * AvenxPage is a specialized component that can host child components.
 * It automatically mounts child components defined in its template via [data-avenx-comp].
 */
export class AvenxPage<S extends Record<string, any> = Record<string, any>> extends AvenxComponent<S> {
    /**
     * @param initialState Initial page state.
     * @param computed Page computed properties.
     * @param bridges Page shared bridges.
     * @param template Page HTML template.
     * @param methods Page methods / lifecycle actions.
     * @param componentRegistry Component class registry map.
     */
    constructor(
        initialState?: S,
        computed?: Record<string, string>,
        bridges?: Record<string, any>,
        template?: string,
        methods?: Record<string, string | Function>,
        componentRegistry?: Map<string, typeof AvenxComponent>,
        props?: Record<string, any>
    );
}

/**
 * Built-in component for high-performance virtualized list rendering.
 */
export class VirtualList extends AvenxComponent<any> {
    constructor(
        bridges?: Record<string, any>,
        props?: Record<string, any>
    );
    currentPage: number;
    goToPage(targetPage: number): void;
    nextPage(): void;
    prevPage(): void;
}

/**
 * Configuration options for the AvenxRouter.
 */
export interface AvenxRouterOptions {
    /**
     * Optional path prefix for all routes (e.g. 'app').
     */
    prefix?: string;

    /**
     * The time in milliseconds to wait before a route guard execution times out (default is 5000ms).
     */
    guardTimeout?: number;

    /**
     * The target hash path to redirect to if a route guard times out (e.g. '#/').
     */
    guardTimeoutRedirect?: string;

    /**
     * A string prepended to every resolved route title.
     */
    titlePrefix?: string;

    /**
     * A string appended to every resolved route title (e.g. ' — MyApp').
     */
    titleSuffix?: string;

    /**
     * Controls scroll position after successful navigation.
     * - `'top'` (default): scroll to (0, 0)
     * - `'auto'`: restore the last saved position for the target hash, otherwise scroll to top
     * - `'manual'`: do not change scroll position
     */
    scrollRestoration?: 'top' | 'auto' | 'manual';
}

/**
 * Definition object for a single route entry.
 */
export interface AvenxRouteDefinition {
    /**
     * The registered page name to mount for this route.
     */
    page: string;

    /**
     * Optional guards to evaluate before activating this route.
     */
    guards?: Array<typeof AvenxGuard | AvenxGuard>;

    /**
     * Optional page title. Can be a static string or a function receiving
     * the parsed route params and returning a string.
     */
    title?: string | ((params: Record<string, any>) => string);

    /**
     * Optional transition name for page enter/leave animations.
     */
    transition?: string;
}

/**
 * AvenxRouter handles hash-based routing for the application.
 * It maps URL hashes to specific Page components.
 */
export class AvenxRouter {
    /**
     * The main application instance.
     */
    app: AvenxApp;

    /**
     * Map of route pattern strings to Page names or route config definitions.
     */
    routes: Record<string, string | AvenxRouteDefinition>;

    /**
     * Info about the currently loaded route.
     */
    currentRoute: { hash: string; page: string; params: Record<string, any> } | null;

    /**
     * @param app AvenxApp instance.
     * @param routes Mapped routes.
     * @param options Router options.
     */
    constructor(
        app: AvenxApp,
        routes?: Record<string, string | AvenxRouteDefinition>,
        options?: AvenxRouterOptions
    );

    /**
     * Registers a global guard callback that executes before route guards on navigation transitions.
     * @param callback The guard callback or guard instance/class.
     * @returns Unregister function.
     */
    beforeEach(
        callback: (
            to: { hash: string; page: string; params: Record<string, any> },
            from: { hash: string; page: string; params: Record<string, any> } | null
        ) => boolean | string | object | void | Promise<boolean | string | object | void> | typeof AvenxGuard | AvenxGuard
    ): () => void;

    /**
     * Registers a global after hook callback that executes after successful route navigation.
     * @param callback The callback to execute after navigation.
     * @returns Unregister function.
     */
    afterEach(
        callback: (
            to: { hash: string; page: string; params: Record<string, any> },
            from: { hash: string; page: string; params: Record<string, any> } | null
        ) => void
    ): () => void;

    /**
     * Starts listening to hash changes and processes the initial route.
     */
    start(): void;

    /**
     * Triggers a manual router navigation.
     * @param hash Target path hash (e.g. `#/profile/123`).
     */
    navigate(hash: string): void;

    /**
     * Destroys the router and cleans up event listeners.
     */
    destroy(): void;
}

/**
 * The main application class for Avenx.
 * Manages component registration, bridge registration, and mounting.
 */
export class AvenxApp {
    /**
     * Registered page classes map.
     */
    pages: Map<string, typeof AvenxPage>;

    /**
     * Registered component classes map.
     */
    components: Map<string, typeof AvenxComponent>;

    /**
     * Shared reactive bridges dictionary.
     */
    bridges: Record<string, any>;

    /**
     * Registered custom directives.
     */
    directives: Map<string, any>;

    /**
     * Active router instance.
     */
    router: AvenxRouter | null;

    /**
     * @param config Main app configurations.
     */
    constructor(config: { target: string; logging?: any; enableProfiling?: boolean });

    /**
     * Registers a reusable component class.
     * @param name Component identifier (PascalCase).
     * @param compClass Component class extension.
     */
    register(name: string, compClass: typeof AvenxComponent): void;

    /**
     * Registers a routing page component class.
     * @param name Page name identifier.
     * @param pageClass Page class extension.
     */
    registerPage(name: string, pageClass: typeof AvenxPage): void;

    /**
     * Registers a shared state bridge.
     * @param name Bridge global identifier (e.g. `AuthBridge`).
     * @param bridgeData Raw object schema or instance.
     */
    registerBridge(name: string, bridgeData: Record<string, any> | Function): void;

    /**
     * Forces updates on all active component nodes.
     */
    updateAll(): void;

    /**
     * Mounts page by routing name.
     * @param name Page component name.
     * @param params Dynamic parsed path variables.
     */
    mountPage(name: string, params?: Record<string, any>): void;

    /**
     * Mounts a standalone component.
     * @param name Component registered name.
     * @param targetSelector Target DOM element query selector.
     */
    mount(name: string, targetSelector?: string | null): void;

    /**
     * Programmatically clears cached KeepAlive component instances.
     * @param componentName Optional component or page name to purge.
     * @returns boolean True if cache entries were evicted.
     */
    clearKeepAliveCache(componentName?: string): boolean;

    /**
     * Scaffolds hash-change router listeners.
     * @param routes Map of URL hashes.
     * @param options Router options.
     */
    initRouter(
        routes: Record<string, string | AvenxRouteDefinition>,
        options?: AvenxRouterOptions
    ): AvenxRouter;

    /**
     * Registers an application-wide error handler callback.
     * @param callback Callback triggered when an unhandled lifecycle or event handler error occurs.
     */
    onError(callback: (error: Error, component: AvenxComponent, origin: string) => void): this;

    /**
     * Registers a plugin with the application. Supports synchronous plugins, async installer functions, dynamic import loaders, or Promises.
     * @param plugin The plugin object, installer function, async loader function, or Promise.
     * @param options Optional configurations for the plugin.
     * @returns The app instance or a Promise resolving to the app instance.
     */
    use(
        plugin:
            | ((app: AvenxApp, options?: Record<string, any>) => any)
            | { install(app: AvenxApp, options?: Record<string, any>): any }
            | (() => Promise<any>)
            | Promise<any>,
        options?: Record<string, any>
    ): this | Promise<this>;

    /**
     * Registers a custom directive.
     * @param name Directive name.
     * @param definition Directive lifecycle definition.
     */
    directive(name: string, definition: {
        mounted?(el: any, binding: { value: any; expression: string }): void;
        updated?(el: any, binding: { value: any; oldValue: any; expression: string }): void;
        unmounted?(el: any, binding: { value: any; oldValue: any; expression: string }): void;
    }): this;
}

/**
 * Base class for global reactive bridges.
 */
export class AvenxBridge {
    constructor();
}

/**
 * Factory for creating reactive state proxies.
 */
export class StateFactory {
    constructor(handlerFactoryClass?: typeof ProxyHandlerFactory);
    create<T extends Record<string, any> = Record<string, any>>(initialState?: T, options?: Record<string, any>): T;
}

/**
 * Factory for creating state proxy traps.
 */
export class ProxyHandlerFactory {
    constructor(options?: {
        computedKeys?: string[];
        onChange?: () => void;
        getComputedValue?: (key: string, target: any) => any;
    });
    create(): ProxyHandler<any>;
}

/**
 * Handles virtual DOM recursive diffing and attribute syncs.
 */
export class DomPatcher {
    patch(target: Element, html: string): void;
}

/**
 * Manages keyed template iteration for lists.
 */
export class ListManager {
    constructor(evaluator: DynamicEvaluator, renderer: TemplateRenderer);
    process(root: Element, scope: Record<string, any>, state: Record<string, any>): void;
}

/**
 * Manages deferred loading (<@defer>) of DOM subtrees.
 */
export class DeferManager {
    constructor(evaluator: DynamicEvaluator, renderer: TemplateRenderer, eventBinder?: EventBinder, componentName?: string);
    process(root: Element, scope: Record<string, any>, state: Record<string, any>, app?: any): void;
    isLoaded(el: Element): boolean;
    loadDeferredContent(container: Element, scope: Record<string, any>, state: Record<string, any>, app?: any): void;
    destroy(): void;
}

/**
 * Provides static HTML diff string algorithms.
 */
export class HtmlDiff {
    diff(oldHtml: string, newHtml: string): string;
}

/**
 * Binds event listeners recursively on elements.
 */
export class EventBinder {
    bind(root: Element | DocumentFragment, dispatcher: EventExecutor): void;
}

/**
 * Event wrapper to invoke custom methods.
 */
export class EventExecutor {
    constructor(runHandler: (source: string | Function, event: Event | null) => any);
    execute(source: string, event?: Event | null): any;
}

/**
 * Safe expression evaluation context binder.
 */
export class DynamicEvaluator {
    evaluateExpression(expression: string, scope?: Record<string, any>, thisArg?: any): any;
    executeStatement(source: string, scope?: Record<string, any>, thisArg?: any): any;
    createMethodMap(
        methods: Record<string, string | Function>,
        getScope: (methods: any) => Record<string, any>,
        getThisArg: () => any
    ): Record<string, Function>;
}

/**
 * Evaluates template bracket expressions.
 */
export class TemplateRenderer {
    constructor(capacityOrConfig?: number | { capacity?: number; templateCacheCapacity?: number });
    capacity: number;
    cache: LruCache;
    clearCache(): void;
    render(template: string, resolver: (expr: string) => any): string;
}

/**
 * Triggers initial mounting states.
 */
export class LifecycleManager {
    mount(component: AvenxComponent<any>, target: Element | string): void;
}

export class ComputedRegistry {
    constructor(computed?: Record<string, string>);
    keys(): string[];
    get(key: string): string;
}

export class HtmlEscaper {
    escape(str: string): string;
    unescape(str: string): string;
}

export class SafeHtml {
    value: string;
    constructor(value: any);
    toString(): string;
}

export function html(strings: string | TemplateStringsArray, ...values: any[]): SafeHtml;
export function unescapeHtml(str: string): string;

export class Sanitizer {
    sanitize(html: string): string;
    static sanitizeUrl(url: string, allowedProtocols?: string[]): string;
    static stripTags(html: string): string;
}

export interface AvenxLoggerOptions {
    level?: string;
    silent?: boolean;
    formatter?: (level: string, args: any[]) => any[];
    transports?: Array<any | ((level: string, formattedArgs: any[], rawArgs: any[]) => void)>;
}

export interface AvenxLoggerBindings {
    prefix?: string;
    componentName?: string;
}

export class AvenxLogger {
    config: {
        level: string;
        silent: boolean;
        formatter: (level: string, args: any[]) => any[];
        transports: any[];
    };
    bindings: Record<string, any>;
    constructor(config?: AvenxLoggerOptions);
    configure(config: AvenxLoggerOptions): void;
    setLevel(level: string): void;
    shouldLog(level: string): boolean;
    write(level: string, ...args: any[]): void;
    child(bindings?: string | AvenxLoggerBindings): AvenxLogger;
    trace(...args: any[]): void;
    debug(...args: any[]): void;
    info(...args: any[]): void;
    log(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
    fatal(...args: any[]): void;
}

export const logger: AvenxLogger;

export const LogLevels: Record<string, number>;

export function formatContextTag(context: any): string;

export function defaultFormatter(level: string, args: any[]): any[];

export const consoleTransport: {
    log(level: string, formattedArgs: any[]): void;
};

export interface ResourceOptions {
    pollInterval?: number;
}

export type ResourceStatus = 'idle' | 'pending' | 'resolved' | 'rejected';

export class Resource<T = any> {
    constructor(
        name: string,
        handlerFn: () => any,
        componentContext?: object | ResourceOptions,
        options?: ResourceOptions
    );

    name: string;
    status: ResourceStatus;
    value: T | undefined;
    error: any;
    promise: Promise<T> | null;
    pollInterval: number;

    read(): T;
    fetch(result?: any): void;
    teardown(): void;
}

export class AvenxWatcher {
    getter: () => any;
    callback: (newValue: any, oldValue: any) => void;
    options: { immediate?: boolean; lazy?: boolean; deep?: boolean; debounce?: number; throttle?: number };
    value: any;
    dirty: boolean;
    constructor(
        getter: () => any,
        callback?: ((newValue: any, oldValue: any) => void) | null,
        options?: { immediate?: boolean; lazy?: boolean; deep?: boolean; debounce?: number; throttle?: number }
    );
    get(): any;
    evaluate(): any;
    teardown(): void;
}

export interface MockBridgeStateChange {
    prop: string;
    value: any;
}

export interface MockBridgeCall {
    method: string;
    args: any[];
}

export type MockBridge<T> = T & {
    $calls: MockBridgeCall[];
    $stateChanges: MockBridgeStateChange[];
    $onStateChange(cb: (prop: string, value: any) => void): () => void;
    $onCall(cb: (method: string, args: any[]) => void): () => void;
    $reset(): void;
    readonly $isMock: true;
};

export class AvenxMock {
    static createMockBridge<T extends object>(
        bridgeClassOrObject: T | (new (...args: any[]) => T),
        initialData?: Partial<T> | Record<string, any>
    ): MockBridge<T>;

    static createSandbox(): AvenxSandbox;

    static createMockRouter(options?: {
        currentRoute?: { hash?: string; page?: string; params?: Record<string, any> };
        hash?: string;
        page?: string;
        params?: Record<string, any>;
        queryParams?: Record<string, any>;
        guards?: Array<
            | ((to: any, from: any) => boolean | string | void)
            | { canActivate: (to: any, from: any) => boolean | string | void }
        >;
    }): {
        currentRoute: { hash: string; page: string; params: Record<string, any> };
        push(path: string): boolean;
        replace(path: string): boolean;
        getParams(): Record<string, any>;
        $calls: Array<{ method: string; args: any[]; blocked?: boolean }>;
        $reset(): void;
        readonly $isMock: true;
    };

    static trigger(element: any, eventName: string, eventData?: Record<string, any>): void;

    static mountTestComponent<C extends AvenxComponent<any> = AvenxComponent<any>>(
        ComponentClass: new (...args: any[]) => C,
        options?: MountTestComponentOptions
    ): Promise<MountTestComponentResult<C>>;

    static fireEvent(
        element: any,
        eventType: string,
        detail?: Record<string, any>
    ): Promise<void>;
}

export interface MountTestComponentOptions {
    props?: Record<string, any>;
    slots?: Record<string, any> | string | any;
    state?: Record<string, any>;
    initialState?: Record<string, any>;
    bridges?: Record<string, any>;
    components?: Record<string, typeof AvenxComponent>;
    container?: any;
    route?: Record<string, any>;
}

export interface MountTestComponentResult<C = AvenxComponent<any>> {
    instance: C;
    component: C;
    element: any;
    container: any;
    update(): void;
    unmount(): void;
    readonly html: string;
}

export function mountTestComponent<C extends AvenxComponent<any> = AvenxComponent<any>>(
    ComponentClass: new (...args: any[]) => C,
    options?: MountTestComponentOptions
): Promise<MountTestComponentResult<C>>;

export function fireEvent(
    element: any,
    eventType: string,
    detail?: Record<string, any>
): Promise<void>;

export class AvenxSandbox {
    components: Map<string, typeof AvenxComponent>;
    bridges: Record<string, any>;
    constructor();
    register(name: string, compClass: typeof AvenxComponent): this;
    registerBridge(name: string, bridgeInstance: any): this;
    setRoute(route: { hash?: string; page?: string; params?: Record<string, any> }): this;
    waitForUpdate(): Promise<void>;
    mount(
        compClass: typeof AvenxComponent,
        props?: Record<string, any>,
        container?: any
    ): {
        instance: AvenxComponent<any>;
        container: any;
        readonly html: string;
        update(): void;
        trigger(selectorOrElement: any, eventName: string, eventData?: Record<string, any>): void;
    };
}

export function initInspector(app: AvenxApp): void;

export class LruCache<T = any> {
    limit: number;
    onEvict: ((key: string, value: T) => void) | null;
    cache: Map<string, T>;
    constructor(limit: number, onEvict?: ((key: string, value: T) => void) | null);
    get(key: string): T | undefined;
    set(key: string, value: T): void;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    readonly size: number;
}

export interface InvalidComponentTagIssue {
    tagName: string;
    expectedName: string;
    index: number;
}

export function componentNameFromFile(fileName: string): string;
export function findRegisteredComponents(projectRoot: string, componentsDir?: string): Set<string>;
export function extractLintableTemplate(source: string): string;
export function findInvalidComponentTags(source: string, registeredComponents: Set<string>): InvalidComponentTagIssue[];
export function findProjectRoot(filePath: string, fallbackRoot: string): string;

export function profile<T = any>(enableProfiling: boolean, componentName: string, phase: string, fn: () => T): T;
export function getComponentProfilingInfo(element: any): { enableProfiling: boolean; componentName: string };

export class DeadlockManager {
    constructor(evaluator: any, renderer: any, eventBinder?: any, componentName?: string);
    isTripped(container: any): boolean;
    findBoundaries(root: any): any[];
    trip(container: any, error?: Error | object, scope?: object): void;
    reset(container: any): void;
}

export function setSchedulerMaxFlushCount(count: number): void;
export function getSchedulerMaxFlushCount(): number;
export interface SchedulerDeadlockEvent {
    cyclePath: string;
    triggeringJobId?: any;
    executionHistory?: Array<{ id: any; name: string; job: Function }>;
}
export function onSchedulerDeadlock(handler: (event: SchedulerDeadlockEvent) => void): () => void;
export function resetScheduler(): void;

export function getActiveCausationTrace(): string[];
export function clearCausationTrace(): void;


