# unnestcss

Simple CSS unnesting.

```ts
import { unnest } from "unnestcss";

unnest(`
.a {
  --a:A;
  .b{
    --b:B;
  }
}
`);
/* 
  Chrome 120+=
  .a {
    --a:A;
    .b{
      --b:B;
    }
  }

  Chrome 120-
  .a {
    --a:A;
   }
  .a .b{
      --b:B;
  }
*/

unnest(`
p {
  color: bisque;
  & {
    color: aqua;
  }
} 
`,false)
/* 
  p {
    color: bisque;
  }
  p:is(p) {
    color: aqua;
  }
*/
```

[[MDN] Using CSS nesting](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting/Using_CSS_nesting)

[[MDN] Browser Compatibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Nesting_selector#browser_compatibility)
