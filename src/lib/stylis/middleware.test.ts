import { describe, expect, test } from "vitest";
import { compile, middleware, namespace, serialize, stringify } from "../stylis.ts";

describe("Middleware", () => {
  test("namespace", () => {
    expect(
      serialize(
        compile(
          `.user{width:0; :global(p,a){width:1;} h1 {width:1; h2:last-child {width:2} h2 h3 {width:3}}}`,
        ),
        middleware([namespace, stringify]),
      ),
    ).to.equal(
      [
        `.user{width:0;}`,
        `p,a{width:1;}`,
        `h1.user.user{width:1;}`,
        `h1.user h2:last-child.user{width:2;}`,
        `h1.user h2 h3.user{width:3;}`,
      ].join(""),
    );

    expect(
      serialize(compile(`.user:before{color:red;}`), middleware([namespace, stringify])),
    ).to.equal([`:before.user.user{color:red;}`].join(""));

    expect(
      serialize(compile(`.user:global(.bar){color:red;}`), middleware([namespace, stringify])),
    ).to.equal([`.bar{color:red;}`].join(""));
  });

  test("comments", () => {
    expect(
      serialize(
        compile(`/*@noflip*/ .user{//noflip\n\n}`),
        middleware([(value) => (value.type === "comm" ? "color:red;" : ""), stringify]),
      ),
    ).to.deep.equal([`color:red;.user{color:red;}`].join());
  });
});
