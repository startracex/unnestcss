import {
  AMPERSAND,
  ASTERISK,
  AT,
  CARRIAGE_RETURN,
  COLON,
  COMMA,
  DOUBLE_QUOTE,
  HORIZONTAL_TAB,
  LEFT_CURLY_BRACKET,
  LEFT_PARENTHESIS,
  LEFT_SQUARE_BRACKET,
  LINE_FEED,
  MINUS,
  NULL_CHARACTER,
  PARENT_REF,
  REVERSE_SOLIDUS,
  RIGHT_CURLY_BRACKET,
  SEMICOLON,
  SINGLE_QUOTE,
  SOLIDUS,
  SPACE,
  START_OF_HEADING,
} from "./chars.ts";
import { buildRuleset, CommentNode, DeclarationNode, type AstNode } from "./ast.ts";
import { TokenKind, Tokenizer, tokenKind } from "./tokenizer.ts";

interface ParseOptions {
  value?: string;
  root?: AstNode | null;
  parent?: AstNode | null;
  rule?: AstNode | AstNode[] | null;
  parentSelectors?: string[];
  rulesets?: AstNode[];
  pseudo?: number;
  selectorBreaks?: number[];
  declarations?: AstNode[];
}

function shouldNestAtRule(atruleChar: string | undefined, characters: string): boolean {
  switch (atruleChar) {
    case "c":
      return characters.slice(2, 10) === "ontainer";
    case "l":
      return characters.slice(2, 6) === "ayer";
    case "d":
    case "m":
    case "s":
      return true;
    default:
      return false;
  }
}

export const parse = (tokenizer: Tokenizer, options: ParseOptions = {}): AstNode[] => {
  const {
    value = "",
    root = null,
    parent = null,
    parentSelectors = [""],
    rulesets = [],
    pseudo = 0,
    selectorBreaks = [0],
  } = options;

  let rule: AstNode | AstNode[] | null = options.rule ?? null;
  const declarations: AstNode[] = options.declarations ?? rulesets;

  let breakCount = 0;
  let atRulePrefixLength = 0;
  let propertyEnd = pseudo;
  let atruleChar: string | undefined;
  /** charCode of the character before `:`; 0 means not a declaration. */
  let declNamePrevCode = 0;
  /** Custom property value: braces are data, not structure. */
  let inCustomProperty = false;
  let customBraceDepth = 0;
  let scanning = true;
  /** +1 normal segment; -1 segment contains PARENT_REF. */
  let parentRefSign = 1;
  let currentChar: string = NULL_CHARACTER;
  let previousChar: string = NULL_CHARACTER;
  let type = "";
  let props: string[] = parentSelectors;
  let children: AstNode[] = rulesets;
  let buffer = "";

  const charOr = (ch: string, fallback: string): string => (ch === NULL_CHARACTER ? fallback : ch);

  const resetStatementState = (): void => {
    breakCount = 0;
    atRulePrefixLength = 0;
    declNamePrevCode = 0;
    inCustomProperty = false;
    customBraceDepth = 0;
    parentRefSign = 1;
    type = "";
    buffer = "";
    propertyEnd = pseudo;
  };

  const flushDeclarations = (): void => {
    if (parentRefSign === -1) {
      buffer = buffer.replace(PARENT_REF, "");
    }
    if (
      declNamePrevCode > 0 &&
      (buffer.length - propertyEnd || (inCustomProperty && previousChar === SOLIDUS))
    ) {
      const rootNode = (Array.isArray(rule) ? parent : rule) ?? null;
      if (declNamePrevCode > 32) {
        declarations.push(
          DeclarationNode.fromBuffer({
            value: buffer + SEMICOLON,
            root: rootNode,
            parent,
            propertyLength: propertyEnd - 1,
            siblings: declarations,
            line: tokenizer.line,
            column: tokenizer.column,
          }),
        );
      } else {
        declarations.push(
          DeclarationNode.fromBuffer({
            value: buffer.replace(SPACE, "") + SEMICOLON,
            root: rootNode,
            parent,
            propertyLength: propertyEnd - 2,
            siblings: declarations,
            line: tokenizer.line,
            column: tokenizer.column,
          }),
        );
      }
    }
  };

  const pushRulesetAndMaybeNest = (openingChar: string): void => {
    props = [];
    children = [];
    const node = buildRuleset({
      value: buffer,
      root,
      parent,
      breakCount,
      atRulePrefixLength,
      parentSelectors,
      selectorBreaks,
      type,
      props,
      children,
      length: propertyEnd,
      siblings: rulesets,
      line: tokenizer.line,
      column: tokenizer.column,
    });
    rulesets.push(node);
    const outerRule = rule;
    rule = node;

    if (openingChar !== LEFT_CURLY_BRACKET) {
      return;
    }

    if (atRulePrefixLength === 0) {
      parse(tokenizer, {
        value: buffer,
        root,
        parent: node,
        rule: node,
        parentSelectors: props,
        rulesets,
        pseudo: propertyEnd,
        selectorBreaks,
        declarations: children,
      });
      return;
    }

    if (shouldNestAtRule(atruleChar, buffer)) {
      let nestedDeclarations = children;
      if (outerRule) {
        props = [];
        children.push(
          buildRuleset({
            value,
            root: node,
            parent: node,
            breakCount: 0,
            atRulePrefixLength: 0,
            parentSelectors,
            selectorBreaks,
            type,
            props: parentSelectors,
            children: props as unknown as AstNode[],
            length: propertyEnd,
            siblings: children,
            line: tokenizer.line,
            column: tokenizer.column,
          }),
        );
        nestedDeclarations = props as unknown as AstNode[];
      }
      parse(tokenizer, {
        value,
        root: node,
        parent: node,
        rule: children,
        parentSelectors,
        rulesets: children,
        pseudo: propertyEnd,
        selectorBreaks,
        declarations: nestedDeclarations,
      });
    } else {
      parse(tokenizer, {
        value: buffer,
        root: node,
        parent: node,
        rule: node,
        rulesets: children,
        selectorBreaks,
        declarations: children,
      });
    }
  };

  /**
   * Handles `{` / `}` / `;` / `\0` the way stylis' fallthrough switch does,
   * without multiplying char codes by flags.
   */
  const handleStatementBoundary = (ch: string): void => {
    if (ch === NULL_CHARACTER || ch === RIGHT_CURLY_BRACKET) {
      scanning = false;
    }

    // stylis fallthrough: `}` / `\0` always flush decls then break.
    // `;` flushes decls only when atRulePrefixLength === 0 (fromCharCode(59+offset)).
    if (
      ch === NULL_CHARACTER ||
      ch === RIGHT_CURLY_BRACKET ||
      (ch === SEMICOLON && atRulePrefixLength === 0)
    ) {
      flushDeclarations();
      resetStatementState();
      return;
    }

    if (ch === SEMICOLON) {
      buffer += SEMICOLON;
      pushRulesetAndMaybeNest(ch);
      resetStatementState();
      return;
    }

    // `{` → ruleset (+ nested parse)
    if (ch === LEFT_CURLY_BRACKET) {
      pushRulesetAndMaybeNest(ch);
      resetStatementState();
    }
  };

  const handleDefaultChar = (): void => {
    if (inCustomProperty) {
      if (currentChar === LEFT_CURLY_BRACKET) {
        customBraceDepth++;
      } else if (currentChar === RIGHT_CURLY_BRACKET) {
        if (customBraceDepth > 0) {
          customBraceDepth--;
        } else {
          inCustomProperty = false;
          tokenizer.prev();
          return;
        }
      }
    }

    buffer += currentChar;

    if (inCustomProperty) {
      return;
    }

    switch (currentChar) {
      case AMPERSAND:
        if (atRulePrefixLength > 0) {
          parentRefSign = 1;
        } else {
          buffer += PARENT_REF;
          parentRefSign = -1;
        }
        break;
      case COMMA:
        selectorBreaks[breakCount] = (buffer.length - 1) * parentRefSign;
        breakCount++;
        parentRefSign = 1;
        break;
      case AT: {
        if (tokenizer.peek() === MINUS) {
          buffer += tokenizer.delimit(tokenizer.next());
        }
        atruleChar = tokenizer.peek();
        type = buffer += tokenizer.identifier(tokenizer.position);
        atRulePrefixLength = propertyEnd = type.length;
        currentChar = "_";
        break;
      }
      case MINUS:
        if (previousChar === MINUS && buffer.length === 2) {
          inCustomProperty = true;
          customBraceDepth = 0;
        }
        break;
    }
  };

  while (scanning) {
    previousChar = currentChar;
    currentChar = tokenizer.next();

    switch (currentChar) {
      case LEFT_PARENTHESIS:
        if (buffer[propertyEnd - 1] === COLON) {
          const delimited = tokenizer
            .delimit(currentChar)
            .replace(AMPERSAND, AMPERSAND + PARENT_REF);
          buffer += delimited;
          const startPos = Math.abs(breakCount ? selectorBreaks[breakCount - 1]! : 0);
          if (buffer.indexOf(AMPERSAND + PARENT_REF, startPos) !== -1) {
            parentRefSign = -1;
          }
          break;
        }
      // fallthrough
      case DOUBLE_QUOTE:
      case SINGLE_QUOTE:
      case LEFT_SQUARE_BRACKET:
        buffer += tokenizer.delimit(currentChar);
        break;

      case HORIZONTAL_TAB:
      case LINE_FEED:
      case CARRIAGE_RETURN:
      case SPACE:
        buffer += tokenizer.whitespace(previousChar);
        break;

      case REVERSE_SOLIDUS:
        buffer += tokenizer.escaping(tokenizer.position - 1, 7);
        continue;

      case SOLIDUS:
        switch (tokenizer.peek()) {
          case ASTERISK:
          case SOLIDUS: {
            declarations.push(
              new CommentNode({
                value: tokenizer.commenter(tokenizer.next(), tokenizer.position),
                root,
                parent,
                props: tokenizer.character,
                siblings: declarations,
                line: tokenizer.line,
                column: tokenizer.column,
              }),
            );
            if (
              (tokenKind(charOr(previousChar, START_OF_HEADING)) === TokenKind.Whitespace ||
                tokenKind(charOr(tokenizer.peek(), START_OF_HEADING)) === TokenKind.Whitespace) &&
              buffer.length &&
              buffer.slice(-1) !== SPACE
            ) {
              buffer += SPACE;
            }
            break;
          }
          default:
            buffer += SOLIDUS;
        }
        break;

      case LEFT_CURLY_BRACKET:
        if (inCustomProperty) {
          handleDefaultChar();
          break;
        }
        selectorBreaks[breakCount] = buffer.length * parentRefSign;
        breakCount++;
        handleStatementBoundary(currentChar);
        break;

      case RIGHT_CURLY_BRACKET:
        if (inCustomProperty) {
          handleDefaultChar();
          break;
        }
        handleStatementBoundary(currentChar);
        break;

      case SEMICOLON:
      case NULL_CHARACTER:
        handleStatementBoundary(currentChar);
        break;

      case COLON:
        propertyEnd = 1 + buffer.length;
        declNamePrevCode = previousChar.charCodeAt(0) | 0;
      // fallthrough
      default:
        handleDefaultChar();
    }
  }

  return rulesets;
};

export const compile = (value: string): AstNode[] => parse(new Tokenizer(value));
