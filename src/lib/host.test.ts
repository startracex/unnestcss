import { describe, expect, test } from "vitest";
import { compile, middleware, serialize, stringify } from "./stylis.ts";
import host from "./host.ts";

function serializeHost(value) {
  return serialize(compile(value), middleware([host, stringify]));
}

describe("Host", () => {
  test("host", () => {
    expect(
      serializeHost(`
        :host {
          width: 0;
          &:hover {
            width: 1;
          }
          &[attr] {
            width: 2;
          }
          :focus {
            width: 3;
          }
          h1 {
            width: 4;
          }
          + h1 {
            width: 5;
          }
          ~ h1 {
            width: 5;
          }
          > h1 {
            width: 5;
          }
        }
        `)
    ).to.equal(
      [
        //
        `:host{width:0;}`,
        `:host(:hover){width:1;}`,
        `:host([attr]){width:2;}`,
        `:host :focus{width:3;}`,
        `:host h1{width:4;}`,
        `:host +h1{width:5;}`,
        `:host ~h1{width:5;}`,
        `:host >h1{width:5;}`,
      ].join("")
    );
  });
});
