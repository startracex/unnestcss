import { describe, expect, test } from "vitest";
import { Tokenizer } from "./tokenizer.ts";

describe("Tokenizer", () => {
  test("tokenize", () => {
    expect(new Tokenizer(`h1 h2 (h1 h2) 1 / 3 * 2 + 1 [1 2] "1 2" a`).tokenize()).to.deep.equal([
      "h1",
      " ",
      "h2",
      " ",
      "(h1 h2)",
      " ",
      "1",
      " ",
      "/",
      " ",
      "3",
      " ",
      "*",
      " ",
      "2",
      " ",
      "+",
      " ",
      "1",
      " ",
      "[1 2]",
      " ",
      '"1 2"',
      " ",
      "a",
    ]);

    expect(new Tokenizer(`:global([data-popper-placement^='top'])`).tokenize()).to.deep.equal([
      `:`,
      `global`,
      `([data-popper-placement^='top'])`,
    ]);
  });
});
