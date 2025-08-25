import { NULL_CHARACTER } from "./enum.ts";

export const charCodeAt = (value: string, index = 0): number => value.charCodeAt(index) | 0;

export const charCodeFrom: (...codes: number[]) => string = String.fromCharCode;

export const charOr = (value: string, fallback: string): string =>
  value === NULL_CHARACTER ? fallback : value;

export const hash = (value: string, length: number): number => {
  if (charCodeAt(value, 0) ^ 45) {
    let hashValue = length << 2;
    hashValue ^= charCodeAt(value, 0);
    hashValue <<= 2;
    hashValue ^= charCodeAt(value, 1);
    hashValue <<= 2;
    hashValue ^= charCodeAt(value, 2);
    hashValue <<= 2;
    hashValue ^= charCodeAt(value, 3);
    return hashValue;
  }
  return 0;
};

const hexRe = /^[[\da-fA-F]$/;

export const isHexChar = (value: string): boolean => hexRe.test(value);
