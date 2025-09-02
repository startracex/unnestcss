import {
  AMPERSAND,
  ASTERISK,
  AT,
  CARRIAGE_RETURN,
  COLON,
  COMMA,
  COMMENT,
  DECLARATION,
  DOUBLE_QUOTE,
  FORM_FEED,
  HORIZONTAL_TAB,
  MINUS,
  LEFT_CURLY_BRACKET,
  LEFT_PARENTHESIS,
  LEFT_SQUARE_BRACKET,
  LINE_FEED,
  NULL_CHARACTER,
  REVERSE_SOLIDUS,
  RIGHT_CURLY_BRACKET,
  RULESET,
  SEMICOLON,
  SINGLE_QUOTE,
  SOLIDUS,
  SPACE,
  START_OF_HEADING,
  UNDERSCORE,
} from "./enum.ts";
import { charCodeAt, charCodeFrom, charOr } from "./utility.ts";
import { token, Tokenizer } from "./tokenizer.ts";
import type { Element } from "./types.ts";

export const ruleset = ({
  value,
  root,
  parent,
  index,
  offset,
  rules,
  points,
  type,
  props,
  children,
  length,
  siblings,
  line,
  column,
}: {
  value: string;
  root: Element;
  parent: Element | null;
  index: number;
  offset: number;
  rules: string[];
  points: number[];
  type: string;
  props: string[];
  children: Element[];
  length: number;
  siblings?: Element[];
  line: number;
  column: number;
}): Element => {
  let currentPosition = offset - 1;

  const activeRules = offset === 0 ? rules : [""];
  const ruleCount = activeRules.length;

  for (let itemIndex = 0, propIndex = 0; itemIndex < index; itemIndex++) {
    const pointPosition = points[itemIndex];
    const segmentEnd = Math.abs(pointPosition);

    const substring = value.slice(currentPosition + 1, segmentEnd);
    currentPosition = segmentEnd;

    for (let ruleIndex = 0; ruleIndex < ruleCount; ruleIndex++) {
      const processedValue =
        pointPosition > 0
          ? `${activeRules[ruleIndex]} ${substring}`
          : substring.replaceAll(AMPERSAND + FORM_FEED, activeRules[ruleIndex]);
      props[propIndex] = processedValue.trim();
      propIndex++;
    }
  }
  return {
    value,
    root,
    parent,
    type: offset === 0 ? RULESET : type,
    props,
    children,
    length,
    siblings,
    line,
    column,
  } as Element;
};

export const comment = ({
  value,
  root,
  parent,
  props,
  siblings,
  line,
  column,
}: {
  value: string;
  root: Element;
  parent: Element | null;
  props: string;
  siblings?: Element[];
  line: number;
  column: number;
}): Element => {
  return {
    value,
    root,
    parent,
    type: COMMENT,
    props,
    children: value.slice(2, -2),
    length: 0,
    siblings,
    line,
    column,
  } as Element;
};

export const declaration = ({
  value,
  root,
  parent,
  length,
  siblings,
  line,
  column,
}: {
  value: string;
  root: Element;
  parent: Element | null;
  length: number;
  siblings?: Element[];
  line: number;
  column: number;
}): Element => {
  return {
    value,
    root,
    parent,
    type: DECLARATION,
    props: value.slice(0, length),
    children: value.slice(length + 1, -1),
    length,
    siblings,
    line,
    column,
  } as Element;
};

export const parse = (
  t: Tokenizer,
  {
    value = "",
    root = null,
    parent = null,
    rule = null,
    rules = [""],
    rulesets = [],
    pseudo = 0,
    points = [0],
    declarations = rulesets,
  }: {
    value?: string;
    root?: Element;
    parent?: Element | null;
    rule?: Element | string[];
    rules?: string[];
    rulesets?: Element[];
    pseudo?: number;
    points?: number[];
    declarations?: string[] | Element[];
  } = {},
): Element[] => {
  let index = 0;
  let offset = 0;
  let length = pseudo;
  let atrule;
  let property = 0;
  let variable = 1;
  let scanning = true;
  let ampersand = 1;
  let currentChar: string = NULL_CHARACTER;
  let previousChar: string = NULL_CHARACTER;
  let type = "";
  let props = rules;
  let children = rulesets;
  let reference = rule;
  let characters = "";

  while (scanning) {
    previousChar = currentChar;
    currentChar = t.next();
    switch (currentChar) {
      // (
      case LEFT_PARENTHESIS:
        if (characters[length - 1] === COLON) {
          const processedChar = t.delimit(currentChar).replace(AMPERSAND, AMPERSAND + FORM_FEED);
          characters += processedChar;
          const startPos = Math.abs(index ? points[index - 1] : 0);

          if (characters.indexOf(AMPERSAND + FORM_FEED, startPos) !== -1) {
            ampersand = -1;
          }
          break;
        }
      // " ' [
      case DOUBLE_QUOTE:
      case SINGLE_QUOTE:
      case LEFT_SQUARE_BRACKET:
        characters += t.delimit(currentChar);
        break;
      // \t \n \r
      case HORIZONTAL_TAB:
      case LINE_FEED:
      case CARRIAGE_RETURN:
      case SPACE:
        characters += t.whitespace(previousChar);
        break;
      // \
      case REVERSE_SOLIDUS:
        characters += t.escaping(t.position - 1, 7);
        continue;
      // /
      case SOLIDUS:
        switch (t.peek()) {
          case ASTERISK:
          case SOLIDUS: {
            (declarations as unknown as Element[]).push(
              comment({
                value: t.commenter(t.next(), t.position),
                root,
                parent,
                props: t.character,
                siblings: declarations as unknown as Element[],
                line: t.line,
                column: t.column,
              }),
            );
            if (
              (token(charOr(previousChar, START_OF_HEADING)) === 5 ||
                token(charOr(t.peek(), START_OF_HEADING)) === 5) &&
              characters.length &&
              characters.slice(-1) !== SPACE
            ) {
              characters += SPACE;
            }
            break;
          }
          default:
            characters += SOLIDUS;
        }
        break;
      // {
      case charCodeFrom(123 * variable):
        points[index] = characters.length * ampersand;
        index++;
      // } ; \0
      case charCodeFrom(125 * variable):
      case SEMICOLON:
      case NULL_CHARACTER:
        switch (currentChar) {
          // \0 }
          case NULL_CHARACTER:
          case RIGHT_CURLY_BRACKET:
            scanning = false;
          // ;
          case charCodeFrom(59 + offset):
            if (ampersand === -1) {
              characters = characters.replace(FORM_FEED, "");
            }
            if (
              property > 0 &&
              (characters.length - length || (variable === 0 && previousChar === SOLIDUS))
            ) {
              (declarations as unknown as Element[]).push(
                property > 32
                  ? declaration({
                      value: characters + SEMICOLON,
                      root: rule as Element,
                      parent,
                      length: length - 1,
                      siblings: declarations as unknown as Element[],
                      line: t.line,
                      column: t.column,
                    })
                  : declaration({
                      value: characters.replace(SPACE, "") + SEMICOLON,
                      root: rule as Element,
                      parent,
                      length: length - 2,
                      siblings: declarations as unknown as Element[],
                      line: t.line,
                      column: t.column,
                    }),
              );
            }
            break;
          // @ ;
          case SEMICOLON:
            characters += SEMICOLON;
          // { rule/at-rule
          default:
            props = [];
            children = [];
            rulesets.push(
              (reference = ruleset({
                value: characters,
                root,
                parent,
                index,
                offset,
                rules,
                points,
                type,
                props,
                children,
                length,
                siblings: rulesets,
                line: t.line,
                column: t.column,
              })),
            );

            if (currentChar === LEFT_CURLY_BRACKET) {
              if (offset === 0) {
                parse(t, {
                  value: characters,
                  root,
                  parent: reference,
                  rule: reference,
                  rules: props,
                  rulesets,
                  pseudo: length,
                  points,
                  declarations: children,
                });
              } else {
                switch (atrule) {
                  // c(ontainer)
                  case "c":
                    if (characters.slice(2, 10) === "ontainer") {
                      break;
                    }
                    offset = 0;
                  // l(ayer)
                  case "l":
                    if (characters.slice(2, 6) === "ayer") {
                      break;
                    }
                    offset = 0;
                  // d(ocument) m(edia) s(upports)
                  case "d":
                  case "m":
                  case "s":
                    break;
                  default:
                    offset = 0;
                }
                if (offset) {
                  if (rule) {
                    props = [];
                    children.push(
                      ruleset({
                        value,
                        root: reference,
                        parent: reference,
                        index: 0,
                        offset: 0,
                        rules,
                        points,
                        type,
                        props: rules,
                        children: props as any,
                        length,
                        siblings: children,
                        line: t.line,
                        column: t.column,
                      }),
                    );
                  }
                  parse(t, {
                    value,
                    root: reference,
                    parent: reference,
                    rule: children as any,
                    rules: rules,
                    rulesets: children,
                    pseudo: length,
                    points,
                    declarations: rule ? props : children,
                  });
                } else {
                  parse(t, {
                    value: characters,
                    root: reference,
                    parent: reference,
                    rule: reference,
                    rulesets: children,
                    points,
                    declarations: children,
                  });
                }
              }
            }
        }
        index = offset = property = 0;
        variable = ampersand = 1;
        type = characters = "";
        length = pseudo;
        break;
      // :
      case COLON:
        length = 1 + characters.length;
        property = charCodeAt(previousChar);
      default:
        if (variable < 1) {
          if (currentChar === LEFT_CURLY_BRACKET) {
            variable--;
          } else if (currentChar === RIGHT_CURLY_BRACKET) {
            variable++;
            if (variable === 1 && t.prev() === RIGHT_CURLY_BRACKET) {
              continue;
            }
          }
        }
        characters += currentChar;
        switch (charCodeFrom(charCodeAt(currentChar) * variable)) {
          // &
          case AMPERSAND:
            if (offset > 0) {
              ampersand = 1;
            } else {
              characters += FORM_FEED;
              ampersand = -1;
            }
            break;
          // ,
          case COMMA:
            points[index] = (characters.length - 1) * ampersand;
            index++;
            ampersand = 1;
            break;
          // @
          case AT:
            // -
            if (t.peek() === MINUS) {
              characters += t.delimit(t.next());
            }
            atrule = t.peek();
            type = characters += t.identifier(t.position);
            offset = length = type.length;
            currentChar = UNDERSCORE;
            break;
          // -
          case MINUS:
            if (previousChar === MINUS && characters.length === 2) {
              variable = 0;
            }
        }
    }
  }

  return rulesets;
};

export const compile = (value: string): Element[] => parse(new Tokenizer(value));
