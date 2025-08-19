# unnestcss

## Installation

```bash
npm install unnestcss
```

## Getting Started

```js
import unnest from "unnestcss";
```

General nesting rules

```js
unnest(`
.root {
  --level: 1;
  .nest {
    --level: 2;
  }
}
`);
```

```css
.root {
  --level: 1;
}
.root .nest {
  --level: 2;
}
```

Nesting rules for `:host`

```js
unnest(`
:host {
  --level: 1;
  &:hover {
    --level: 2;
  }
}
`);
```

```css
:host {
  --level: 1;
}
:host(:hover) {
  --level: 2;
}
```
