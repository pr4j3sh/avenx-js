---
title: 'Utility Functions'
description: 'API documentation for utility tags and helper classes like html, SafeHtml, and HTML Escapers.'
---

Helper classes and tags to manage security and custom markup insertions.

## 1. `html` template tag

Creates a `SafeHtml` wrapper around a template literal, allowing you to build raw HTML content safely. Parameters inserted are automatically escaped unless they are instances of `SafeHtml`.

```javascript
import { html } from 'avenx-core/runtime';

const userContent = "<script>alert('xss')</script>";
const element = html`<div class="content">${userContent}</div>`;
// Output escapes userContent safely!
```

## 2. `SafeHtml` class

A wrapper class designating that a string is verified and safe for raw output. Evaluated directly without escaping inside `{{{ ... }}}` expressions.

## 3. `HtmlEscaper`

Internal utility class providing character replacement mappings to prevent code injections:

```javascript
const escaper = new HtmlEscaper();
escaper.escape('<h1>Text</h1>');
// Returns: &lt;h1&gt;Text&lt;/h1&gt;
```

## 4. `Sanitizer`

A utility class used to escape and clean up templates and dynamic HTML tags by stripping dangerous elements/attributes while preserving safe markup.

### Constructor

```javascript
import { Sanitizer } from 'avenx-core/runtime';

const sanitizer = new Sanitizer(config);
```

- **`config`** *(optional)*: An object to customize the allowed HTML tags and attributes.
  - **`allowedTags`** *(string[])*: Custom array of allowed tag names. Defaults to a standard safe set of elements (e.g., `div`, `span`, `p`, `a`, `img`, etc.).
  - **`allowedAttributes`** *(Record<string, string[]>)*: Custom mapping of tag names to allowed attribute arrays. Use `*` to specify attributes allowed globally on all elements.

### Methods

#### `sanitize(html)`

Sanitizes an input string containing HTML by filtering it against the allowed tags and attributes configuration. Dangerous elements (like `<script>`, `<style>`, `<iframe>`, etc.) and unsafe URL protocols (like `javascript:`, `data:` except for safe image data) are stripped.

- **Parameters:**
  - `html` *(any)*: The raw content to sanitize (coerced to a string).
- **Returns:**
  - `string`: The sanitized, safe HTML string.

### Example

```javascript
import { Sanitizer } from 'avenx-core/runtime';

const sanitizer = new Sanitizer();

// Dangerous tags like <script> are stripped, and unsafe protocols on attributes are removed
const dirtyHtml = '<div>Hello <script>alert("xss")</script> <a href="javascript:alert(1)">World</a></div>';
const cleanHtml = sanitizer.sanitize(dirtyHtml);

console.log(cleanHtml);
// Output: <div>Hello  <a>World</a></div>
```

