import { COMMENT, DECLARATION, RULESET } from "./enum.ts";
import { charat } from "./utility.ts";
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
          : substring.replace(/&\f/g, activeRules[ruleIndex]);
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
    props: value.slice(-length),
    children: value.slice(-length + 1, -1),
    length,
    siblings,
    line,
    column,
  } as Element;
};

export const parse = (
  value: string,
  root: Element,
  parent: Element | null,
  rule: Element | string[],
  rules: string[],
  rulesets: Element[],
  pseudo: number,
  points: number[],
  declarations: string[] | Element[],
  t: Tokenizer,
): Element[] => {
  let index = 0;
  let offset = 0;
  let length = pseudo;
  let atrule = 0;
  let property = 0;
  let previous = 0;
  let variable = 1;
  let scanning = 1;
  let ampersand = 1;
  let character = 0;
  let type = "";
  let props = rules;
  let children = rulesets;
  let reference = rule;
  let characters = type;

  while (scanning) {
    previous = character;
    character = t.next();
    switch (character) {
      // (
      case 40:
        if (previous !== 108 && charat(characters, length - 1) === 58) {
          const processedChar = t.delimit(character).replace("&", "&\f");
          characters += processedChar;
          const startPos = Math.abs(index ? points[index - 1] : 0);

          if (characters.indexOf("&\f", startPos) !== -1) {
            ampersand = -1;
          }
          break;
        }
      // " ' [
      case 34:
      case 39:
      case 91:
        characters += t.delimit(character);
        break;
      // \t \n \r \s
      case 9:
      case 10:
      case 13:
      case 32:
        characters += t.whitespace(previous);
        break;
      // \
      case 92:
        characters += t.escaping(t.caret() - 1, 7);
        continue;
      // /
      case 47:
        switch (t.peek()) {
          case 42:
          case 47:
            (declarations as unknown as Element[]).push(
              comment({
                value: t.commenter(t.next(), t.caret()),
                root,
                parent,
                props: String.fromCharCode(t.character),
                siblings: declarations as unknown as Element[],
                line: t.line,
                column: t.column,
              }),
            );
            if (
              (token(previous || 1) === 5 || token(t.peek() || 1) === 5) &&
              characters.length &&
              characters.slice(-1) !== " "
            ) {
              characters += " ";
            }
            break;
          default:
            characters += "/";
        }
        break;
      // {
      case 123 * variable:
        points[index++] = characters.length * ampersand;
      // } ; \0
      case 125 * variable:
      case 59:
      case 0:
        switch (character) {
          // \0 }
          case 0:
          case 125:
            scanning = 0;
          // ;
          case 59 + offset:
            if (ampersand === -1) {
              characters = characters.replace(/\f/g, "");
            }
            if (
              property > 0 &&
              (characters.length - length || (variable === 0 && previous === 47))
            ) {
              (declarations as unknown as Element[]).push(
                property > 32
                  ? declaration({
                      value: `${characters};`,
                      root: rule as Element,
                      parent,
                      length: length - 1,
                      siblings: declarations as unknown as Element[],
                      line: t.line,
                      column: t.column,
                    })
                  : declaration({
                      value: `${characters.replace(" ", "")};`,
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
          case 59:
            characters += ";";
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

            if (character === 123) {
              if (offset === 0) {
                parse(
                  characters,
                  root,
                  reference,
                  reference,
                  props,
                  rulesets,
                  length,
                  points,
                  children,
                  t,
                );
              } else {
                switch (atrule) {
                  // c(ontainer)
                  case 99:
                    if (charat(characters, 3) === 110) {
                      break;
                    }
                  // l(ayer)
                  case 108:
                    if (charat(characters, 2) === 97) {
                      break;
                    }
                  default:
                    offset = 0;
                  // d(ocument) m(edia) s(upports)
                  case 100:
                  case 109:
                  case 115:
                    break;
                }
                if (offset) {
                  parse(
                    value,
                    reference,
                    reference,
                    rule &&
                      (() => {
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

                        return children as any;
                      })(),
                    rules,
                    children,
                    length,
                    points,
                    rule ? props : children,
                    t,
                  );
                } else {
                  parse(
                    characters,
                    reference,
                    reference,
                    reference,
                    [""],
                    children,
                    0,
                    points,
                    children,
                    t,
                  );
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
      case 58:
        length = 1 + characters.length;
        property = previous;
      default:
        if (variable < 1) {
          if (character === 123) {
            --variable;
          } else if (character === 125 && variable++ === 0 && t.prev() === 125) {
            continue;
          }
        }
        characters += String.fromCharCode(character);
        switch (character * variable) {
          // &
          case 38:
            ampersand = offset > 0 ? 1 : ((characters += "\f"), -1);
            break;
          // ,
          case 44:
            points[index++] = (characters.length - 1) * ampersand;
            ampersand = 1;
            break;
          // @
          case 64:
            // -
            if (t.peek() === 45) {
              characters += t.delimit(t.next());
            }
            atrule = t.peek();
            type = characters += t.identifier(t.caret());
            offset = length = type.length;
            character++;
            break;
          // -
          case 45:
            if (previous === 45 && characters.length === 2) {
              variable = 0;
            }
        }
    }
  }

  return rulesets;
};

export const compile = (value: string): Element[] => {
  const rulesets = [];
  const t = new Tokenizer(value);
  return parse("", null, null, null, [""], rulesets, 0, [0], rulesets, t);
};
