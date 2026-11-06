import { AMPERSAND, COMMENT, DECLARATION, KEYFRAMES, LAYER, PARENT_REF, RULESET } from "./chars.ts";
import type { IMPORT, NAMESPACE } from "./chars.ts";

export type NodeType =
  | typeof COMMENT
  | typeof DECLARATION
  | typeof RULESET
  | typeof KEYFRAMES
  | typeof LAYER
  | typeof IMPORT
  | typeof NAMESPACE
  | (string & {});

interface AstNodeInit {
  value: string;
  root: AstNode | null;
  parent: AstNode | null;
  length?: number;
  siblings?: AstNode[];
  line: number;
  column: number;
  return?: string;
}

export abstract class AstNode {
  parent: AstNode | null;
  root: AstNode | null;
  value: string;
  length: number;
  return: string;
  line: number;
  column: number;
  siblings: AstNode[];
  abstract readonly type: NodeType;
  abstract props: string | string[];
  abstract children: string | AstNode[];

  protected constructor(init: AstNodeInit) {
    this.value = init.value;
    this.root = init.root;
    this.parent = init.parent;
    this.length = init.length ?? 0;
    this.siblings = init.siblings ?? [];
    this.line = init.line;
    this.column = init.column;
    this.return = init.return ?? "";
  }
}

export class RulesetNode extends AstNode {
  readonly type: typeof RULESET | typeof KEYFRAMES | typeof LAYER | (string & {});
  props: string[];
  children: AstNode[];

  constructor(
    init: AstNodeInit & {
      type?: typeof RULESET | typeof KEYFRAMES | typeof LAYER | string;
      props?: string[];
      children?: AstNode[];
    },
  ) {
    super(init);
    this.type = init.type ?? RULESET;
    this.props = init.props ?? [];
    this.children = init.children ?? [];
  }
}

export class DeclarationNode extends AstNode {
  readonly type: typeof DECLARATION = DECLARATION;
  props: string;
  children: string;

  constructor(init: AstNodeInit & { props: string; children: string }) {
    super(init);
    this.props = init.props;
    this.children = init.children;
  }

  static fromBuffer(init: AstNodeInit & { propertyLength: number }): DeclarationNode {
    const value = init.value.endsWith(";") ? init.value : `${init.value};`;
    const length = init.propertyLength;
    return new DeclarationNode({
      ...init,
      value,
      length,
      props: value.slice(0, length),
      children: value.slice(length + 1, -1),
    });
  }
}

export class CommentNode extends AstNode {
  readonly type: typeof COMMENT = COMMENT;
  props: string;
  children: string;

  constructor(init: AstNodeInit & { props: string }) {
    super(init);
    this.props = init.props;
    this.children = init.value.slice(2, -2);
    this.length = 0;
  }
}

export class AtRuleLeafNode extends AstNode {
  readonly type: typeof IMPORT | typeof NAMESPACE;
  props: [];
  children: [];

  constructor(init: AstNodeInit & { type: typeof IMPORT | typeof NAMESPACE }) {
    super(init);
    this.type = init.type;
    this.props = [];
    this.children = [];
  }
}

export type Element = AstNode;

export const isRuleset = (node: AstNode): node is RulesetNode =>
  node.type === RULESET ||
  node.type === KEYFRAMES ||
  node.type === LAYER ||
  (Array.isArray(node.props) && Array.isArray(node.children));

export const isDeclaration = (node: AstNode): node is DeclarationNode => node.type === DECLARATION;

export const isComment = (node: AstNode): node is CommentNode => node.type === COMMENT;

export type Middleware = (
  element: AstNode,
  index: number,
  children: AstNode[],
  callback: Middleware,
) => string | void;

export function buildRuleset(options: {
  value: string;
  root: AstNode | null;
  parent: AstNode | null;
  breakCount: number;
  atRulePrefixLength: number;
  parentSelectors: string[];
  selectorBreaks: number[];
  type: string;
  props: string[];
  children: AstNode[];
  length: number;
  siblings?: AstNode[];
  line: number;
  column: number;
}): RulesetNode {
  const {
    value,
    root,
    parent,
    breakCount,
    atRulePrefixLength,
    parentSelectors,
    selectorBreaks,
    type,
    props,
    children,
    length,
    siblings,
    line,
    column,
  } = options;

  let cursor = atRulePrefixLength - 1;
  const activeRules = atRulePrefixLength === 0 ? parentSelectors : [""];
  const ruleCount = activeRules.length;

  for (let itemIndex = 0, propIndex = 0; itemIndex < breakCount; itemIndex++) {
    const pointPosition = selectorBreaks[itemIndex];
    const segmentEnd = Math.abs(pointPosition);
    const substring = value.slice(cursor + 1, segmentEnd);
    cursor = segmentEnd;

    for (let ruleIndex = 0; ruleIndex < ruleCount; ruleIndex++) {
      const processedValue =
        pointPosition > 0
          ? `${activeRules[ruleIndex]} ${substring}`
          : substring.replaceAll(AMPERSAND + PARENT_REF, activeRules[ruleIndex]);
      props[propIndex] = processedValue.trim();
      propIndex++;
    }
  }

  return new RulesetNode({
    value,
    root,
    parent,
    type: atRulePrefixLength === 0 ? RULESET : type,
    props,
    children,
    length,
    siblings,
    line,
    column,
  });
}
