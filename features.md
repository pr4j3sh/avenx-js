# Avenx-JS Feature-Kompatibilität

In dieser Übersicht wird der aktuelle Support-Status aller Features der Liste für **Avenx-JS** aufgeführt und begründet.

---

## 1. Core Rendering & Lifecycle

| Feature | Status | Begründung |
| :--- | :---: | :--- |
| **Komponenten** | ✅ Unterstützt | Avenx-JS basiert auf einem Komponenten-System. Komponenten werden in `.component.js`- (Logik, State, Template) und `.component.css`-Dateien (scoped Styles) deklariert und zu JS-Klassen kompiliert, die von `AvenxComponent` erben. |
| **JSX oder Template-Syntax** | 📝 Template-Syntax | JSX wird nicht unterstützt. Stattdessen wird eine eigene HTML-basierte Template-Syntax mit `{{ expression }}`-Interpolationen, `<slot>`-Elementen für Transklusion sowie speziellen Compiler-Tags wie `<@for>` verwendet. |
| **Reactive State** | ✅ Unterstützt | Reaktiver State wird über `<state />`-Tags definiert. Zur Laufzeit wird dieser State über JavaScript Proxies (`StateFactory`) überwacht. Änderungen triggern automatisch ein asynchrones Update über den microtask-basierten Scheduler. |
| **Props** | ✅ Unterstützt | Props können an verschachtelte Komponenten übergeben werden (z. B. `<Card title="Avenx" />`). Der Compiler übersetzt diese Attribute in `data-props-*` und übergibt sie an den Konstruktor der Kindklasse. |
| **Event Handling** | ✅ Unterstützt | Event-Listener können mit dem `@`-Präfix (z. B. `@click="increment"`) deklariert werden. Sie werden zur Laufzeit vom `EventBinder` analysiert und registriert. |
| **Conditional Rendering** | ❌ Nicht unterstützt | Es gibt keine eingebauten Direktiven wie `v-if` oder `<@if>`. Bedingtes Rendern muss durch Inline-Ternary-Ausdrücke (z. B. `{{{ state.show ? '<div>...</div>' : '' }}}`) oder durch bedingte CSS-Klassen (`display`) manuell gelöst werden. |
| **Loops (for, map, etc.)** | ✅ Unterstützt | Schleifen werden nativ über das Compiler-Tag `<@for item in list key="id">` unterstützt. Diese werden in `<template data-ax-for="...">`-Tags übersetzt und zur Laufzeit durch den `ListManager` effizient aktualisiert. |
| **Fragments** | ❌ Nicht unterstützt | Es gibt kein Äquivalent zu React-Fragments (`<>...</>`). Die Templates benötigen immer ein umschließendes HTML-Element. |
| **Dynamic Classes** | ⚠️ Eingeschränkt | Es gibt keine dedizierte Direktive wie `data-ax-class` (steht im Backlog). Dynamische Klassen können jedoch über Standard-Interpolationen im `class`-Attribut gesetzt werden (z. B. `class="{{ isActive ? 'active' : '' }}"`). |
| **Dynamic Styles** | ⚠️ Eingeschränkt | Keine dedizierte Direktive wie `data-ax-style`. Dynamische Styles lassen sich aber direkt über Interpolationen im normalen `style`-Attribut anwenden (z. B. `style="color: {{ state.color }}"`). |
| **onMount** | ✅ Unterstützt | Die optionale Lifecycle-Methode `onMount()` wird nach dem Rendern und Einfügen des Komponenten-Elements in das DOM ausgeführt. |
| **onUnmount** | ✅ Unterstützt | Die optionale Lifecycle-Methode `onUnmount()` wird vor dem Entfernen der Komponente ausgeführt, um Event-Listener und Referenzen zu bereinigen. |
| **Cleanup Functions** | ❌ Nicht unterstützt | Es gibt keine automatischen Cleanup-Funktionen (wie die Rückgabefunktion bei Reacts `useEffect` oder Sveltes `onDestroy` Callback-Registrierung). Aufräumarbeiten müssen manuell in `onUnmount` implementiert werden. |
| **Effects** | ❌ Nicht unterstützt | Ein allgemeiner `effect()` oder `watchEffect()` Wrapper existiert im Framework-API nicht. Reaktionen auf State-Änderungen fließen primär direkt in das Rerendering des DOM-Templates. |

---

## 2. Reactivity & Routing

| Feature | Status | Begründung |
| :--- | :---: | :--- |
| **Signals oder vergleichbares** | ❌ Nicht unterstützt | Avenx-JS verwendet Proxies zur State-Überwachung (ähnlich Vue 3) anstelle von expliziten Signals (wie SolidJS oder Preact). |
| **Computed Values** | ✅ Unterstützt | Unterstützt über `<computed name="double" value="count * 2" />`. Diese Werte werden lazy evaluiert, gecacht und bei Änderung ihrer State-Abhängigkeiten automatisch invalidiert. |
| **Watcher** | ❌ Nicht unterstützt | Eine API, um gezielt auf Änderungen einzelner State-Keys zu lauschen (wie `watch` in Vue), ist nicht vorhanden. |
| **Dependency Tracking** | ✅ Unterstützt | Intern implementiert für Computed Properties: Der Proxy registriert während der Auswertung die gelesenen State-Keys in einer Dependency-Map (`depMap`), um gezielte Cache-Invalidierung zu ermöglichen. |
| **Client Side Routing** | ✅ Unterstützt | Wird über die Klasse `AvenxRouter` realisiert, die auf hashbasierten URLs (`window.location.hash`) aufbaut und das `hashchange`-Event überwacht. |
| **Nested Routes** | ❌ Nicht unterstützt | Der Router unterstützt nur flache Routenstrukturen, die direkt auf Top-Level-Seiten (`AvenxPage`) abgebildet werden. |
| **Dynamic Routes** | ✅ Unterstützt | Parameter wie `:id` in der Route (z. B. `/user/:id`) werden automatisch geparst und der Seite übergeben. Auch URL-Query-Parameter werden automatisch in `state.query` abgelegt. |
| **Layouts** | ❌ Nicht unterstützt | Es gibt keine nativen Layout-Komponenten oder verschachtelte Router-Outlets (wie `<router-view>` oder `<Outlet />`). |
| **Route Guards** | ✅ Unterstützt | Asynchrone Guards, die das `canActivate(to, from)` Interface implementieren, werden nacheinander ausgeführt, um Navigationsübergänge abzusichern. |
| **Lazy Loaded Routes** | ❌ Nicht unterstützt | Steht im Backlog. Bisher werden alle Seiten und Komponenten synchron in das finale IIFE-Bundle kompiliert und geladen. |

---

## 3. Forms & Async

| Feature | Status | Begründung |
| :--- | :---: | :--- |
| **Two-way Binding** | ✅ Unterstützt | Wird über die `data-ax-bind`-Direktive für Standard-Inputs, Textareas und Selects unterstützt. Dies wird bei der Kompilierung in einen Wert-Bindung und einen Event-Listener übersetzt. Checkbox-/Radio-Gruppen werden derzeit nicht nativ unterstützt (erfordern manuelle Bindungen). |
| **Validation** | ❌ Nicht unterstützt | Es sind keine Formular-Validierungs-Bibliotheken oder Hilfsfunktionen im Framework enthalten. |
| **Controlled Inputs** | ✅ Unterstützt | Eingabeelemente können manuell oder über `data-ax-bind` als gesteuerte Elemente implementiert werden. |
| **Form Helpers** | ❌ Nicht unterstützt | Keine Hilfsmittel für Formulare (wie Hooks, Utility-Klassen) vorhanden. |
| **Fetch API Wrapper** | ❌ Nicht unterstützt | Es gibt keinen HTTP-Client im Core. Entwickler müssen die native `fetch()` API oder externe Pakete verwenden. |
| **Loading States** | ❌ Nicht unterstützt | Ladezustände müssen manuell über State-Flags (z. B. `state.isLoading = true`) im JavaScript-Code verwaltet werden. |
| **Error States** | ❌ Nicht unterstützt | Es gibt kein integriertes Error-State-Handling auf UI-Ebene (Zentralisierte Error Boundaries stehen im Backlog). |
| **Suspense** | ❌ Nicht unterstützt | Keine Unterstützung für Suspense-Komponenten zum asynchronen Laden oder Platzhaltern. |

---

## 4. Build & Tooling

| Feature | Status | Begründung |
| :--- | :---: | :--- |
| **Dev Server** | ✅ Unterstützt | Das CLI verfügt über einen integrierten Entwicklungs-Server (`avenx serve`), der auf dem nativen Node `http`-Modul basiert. |
| **HMR** | ❌ Nicht unterstützt | Der Dev-Server unterstützt lediglich Live-Reload (vollständiger Page-Reload des Browsers via SSE-Verbindung bei Code-Änderungen), kein Hot Module Replacement. Ein Vite-Plugin ist im Backlog geplant. |
| **Tree Shaking** | ❌ Nicht unterstützt | Der Compiler fügt die Klassen und Runtimes simpel per String-Konkatenation zusammen. Es findet kein Tree Shaking statt. |
| **Production Optimizer** | ❌ Nicht unterstützt | Es gibt keine integrierten Werkzeuge zur Minifizierung oder Code-Kompression im Production-Build. |
| **Source Maps** | ❌ Nicht unterstützt | Source Maps werden während des Kompilierungsprozesses nicht erzeugt. |

---

## 5. Features, die viele grosse Frameworks besitzen

| Feature / Bereich | Status | Begründung |
| :--- | :---: | :--- |
| **Server Rendering (SSR, SSG, ISR, Streaming SSR, Hydration, Partial Hydration)** | ❌ Nicht unterstützt | Avenx-JS ist ein reines Client-Side-Rendering-Framework. Es gibt keine serverseitigen Render-Fähigkeiten. |
| **CLI** | ✅ Unterstützt | Bietet Befehle zur Projektinitialisierung (`init`), Code-Generierung (`g / generate`), Validierung (`check / lint`), Kompilierung (`build`) und Entwicklung (`serve`). |
| **Project Generator** | ✅ Unterstützt | Der Befehl `avenx init` generiert das Standard-Projektgerüst (Ordnerstruktur, Konfigurationen, index.html und Startdateien). |
| **Plugin System** | ❌ Nicht unterstützt | Der Compiler und das CLI haben fest definierte, nicht erweiterbare Pipelines. |
| **TypeScript Support** | ❌ Nicht unterstützt | Der Core und Compiler sind in JavaScript geschrieben. Es existieren lediglich rudimentäre `.d.ts`-Definitionsdateien. Die Generierung von Typdefinitionen für Komponenten steht im Backlog. |
| **ESLint / Prettier Integration** | ❌ Nicht unterstützt | ESLint/Prettier wird vom Framework intern verwendet, aber nicht vorkonfiguriert in neue Benutzerprojekte injiziert. |
| **VS Code Extension** | ❌ Nicht unterstützt | Es existiert keine offizielle VS Code Extension zur Syntaxhervorhebung für `.component.js`-Templates. |
| **Error Overlay** | ❌ Nicht unterstützt | Es gibt kein GUI-Overlay im Browser bei Fehlern. Laufzeitfehler werden in der Entwicklerkonsole des Browsers protokolliert. |
| **Automatic Memoization** | ✅ Unterstützt | Unterstützt deklaratives und automatisches Memoizing für reine und deterministische Subbäume (`data-ax-memo`) sowie das Caching von `computed` Werten. |
| **DOM Diffing** | ✅ Unterstützt | Nutzt die Klasse `DomPatcher`, die DOM-Updates durch Vergleich des neuen gerenderten Templates mit dem bestehenden DOM vornimmt. |
| **Fine-grained Reactivity** | ❌ Nicht unterstützt | State-Änderungen triggern eine Neu-Evaluierung des gesamten Komponenten-Templates (`this.render()`) mit anschließendem DOM-Patching, anstatt einzelne DOM-Knoten feingranular zu verändern. |
| **Compiler Optimizations** | ✅ Unterstützt | Der Compiler führt eine statische Analyse der HTML-Templates durch, markiert statische Subbäume mit `data-ax-static="true"`, und validiert explizite Compiler Contracts (`static`, `pure`, `deterministic`, `isolated`). |
| **Lazy Deferred Loading (<@defer>)** | ✅ Unterstützt | Deklaratives Verzögern des Renderns und Hydrierens von DOM-Subbäumen und Komponenten via `<@defer>` (Triggers: `idle`, `visible`, `interaction`, `timer`, `expression`). |
| **Scoped CSS** | ✅ Unterstützt | Über den `StyleProcessor` werden CSS-Regeln in `<@css>`-Blöcken mit einem MD5-Hash des Inhalts versehen und Scoped-Klassen an HTML-Elemente angehängt. |
| **CSS Variables** | ✅ Unterstützt | Unterstützt native CSS-Variablen sowie ein eigenes `@def`-System im CSS-Compiler für globale Design-Tokens. |
| **Async Data Loading** | ✅ Unterstützt | Reaktive Ressourcen (`createResource` & `<resource name="...">`) ermöglichen deklaratives Laden von Daten mit automatischer Dependency Tracking und Caching. |
| **Suspense** | ✅ Unterstützt | Deklarativer `<@suspense>`-Container mit `<@fallback>`-Komponente zur automatischen Handhabung von asynchronen Ladezuständen während des Aufrufs von Ressourcen. |
| **Error Boundaries** | ✅ Unterstützt | Deklarativer `<@errorBoundary>`-Container fängt Laufzeitfehler in Ressourcen und Unterkomponenten ab und rendert isolierte `<@fallback as="err">`-Fehlerdarstellungen. |
| **CSS-in-JS (optional)** | ❌ Nicht unterstützt | Avenx-JS setzt auf statisch extrahierte CSS-Dateien beim Kompilieren statt dynamischem CSS-in-JS zur Laufzeit. |
| **Tailwind Support** | ❌ Nicht unterstützt | Es gibt kein vorkonfiguriertes TailwindCSS-Setup oder native Integrationen. |
| **Context** | ❌ Nicht unterstützt | Eine Provide/Inject-Schnittstelle zur Weitergabe von State über mehrere Komponentenebenen hinweg existiert noch nicht (im Backlog). |
| **Global Store** | ✅ Unterstützt | Globale, geteilte reaktive Zustände werden über Bridges (`AvenxBridge`) realisiert. |
| **Local Store / Persistence** | ❌ Nicht unterstützt | Keine integrierten Persistierungs-Features (im Backlog). |
| **DevTools** | ❌ Nicht unterstützt | Keine Browser-Entwicklertools oder Debugging-Extensions vorhanden. |
| **Component & Unit Testing** | ✅ Unterstützt | Das Framework bietet eine eigene Test-Suite unter `test/unit` und `test/integration` (z. B. für Props, Slots und Lifecycle-Hooks). |
| **Snapshot Testing / Mocking Utilities** | ❌ Nicht unterstützt | Keine Snapshot-Tests oder spezielle Mocking-Hilfen im Test-Runner enthalten. |
| **Accessibility (ARIA, Focus, Screen Readers)** | ❌ Nicht unterstützt | Keine integrierten Hilfen oder Standards für Barrierefreiheit vorhanden. |
| **Internationalisierung (i18n, RTL)** | ❌ Nicht unterstützt | Keine Core-Unterstützung für Sprachen oder Lokalisierung vorhanden. |

---

## 6. Framework-spezifische Features (Vergleich)

### 🧩 Von Angular inspiriert
* **Dependency Injection**: ❌ Nicht unterstützt.
* **Standalone Components**: ✅ Unterstützt (Jede Komponente wird eigenständig importiert und in `main.app.js` registriert).
* **Signals**: ❌ Nicht unterstützt (nutzt stattdessen Proxies).
* **Zone-less Change Detection**: ✅ Unterstützt (Es wird kein `zone.js` benötigt; Änderungen werden über Proxy-Setters registriert und Updates asynchron in einer Microtask-Queue verarbeitet).
* **Pipes / Directives / Resolvers**: ❌ Nicht unterstützt (Einzig die feste Direktive `data-ax-bind` existiert).
* **Guards**: ✅ Unterstützt (`AvenxGuard` Klassen).
* **Schematics**: ✅ Unterstützt (Einfache CLI-Generatoren über `avenx generate`).

### ⚛️ Von React inspiriert
* **Hooks / Concurrent Rendering / Server Components / Strict Mode**: ❌ Nicht unterstützt (Avenx ist rein klassenbasiert und arbeitet synchron im Rendering-Thread des Browsers).
* **Suspense**: ❌ Nicht unterstützt.

### 💚 Von Vue inspiriert
* **Single File Components**: ❌ Nicht unterstützt (Trennung in `.component.js` und `.component.css`).
* **Composition API / Teleport / Transition Components**: ❌ Nicht unterstützt.
* **Directives (v-if, v-for)**: ⚠️ Teilweise (unterstützt `<@for>` Loops, aber keine bedingten Anweisungen wie `v-if`).

### 🧡 Von Svelte inspiriert
* **Compiler statt Virtual DOM**: ❌ Nicht unterstützt (Verwendet sowohl einen Compiler zum Übersetzen von Templates und CSS als auch einen clientseitigen DOM-Patcher zur Laufzeit).
* **Stores**: ✅ Unterstützt (Die Bridges sind konzeptionell sehr ähnlich zu Svelte-Stores).
* **Actions / Transitions / Animations / Compile-Time Reactivity**: ❌ Nicht unterstützt.

### ⚡ Von SolidJS inspiriert
* **Fine-grained Reactivity**: ❌ Nicht unterstützt (Updates erfolgen komponentenweit und nicht pro DOM-Knoten).
* **No Virtual DOM**: ✅ Unterstützt (Es wird kein virtueller DOM-Baum im Arbeitsspeicher gepflegt; der `DomPatcher` vergleicht das neu gerenderte Template direkt mit dem echten DOM).
* **Resources**: ❌ Nicht unterstützt.
* **Control Flow Components**: ✅ Unterstützt (Über das `<@for>`-Tag).

### 🌀 Von Qwik / Astro / Next.js / Nuxt / Remix inspiriert
* **Resumability / Serializable / Lazy Execution / Event Replay (Qwik)**: ❌ Nicht unterstützt.
* **Islands Architecture / Partial Hydration / Multi-Framework (Astro)**: ❌ Nicht unterstützt.
* **File-based Routing / API Routes / Middleware (Next.js)**: ❌ Nicht unterstützt (Routen werden in `main.app.js` registriert).
* **Auto Imports / Modules / Nitro Server (Nuxt)**: ❌ Nicht unterstützt.
* **Loader Functions / Progressive Enhancement / Nested Data Loading (Remix)**: ❌ Nicht unterstützt.
