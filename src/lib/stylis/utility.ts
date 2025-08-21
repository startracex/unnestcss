export const charat = (value: string, index: number): number => {
  return value.charCodeAt(index) | 0;
};

export const hash = (value: string, length: number): number => {
  if (charat(value, 0) ^ 45) {
    let hashValue = length << 2;
    hashValue ^= charat(value, 0);
    hashValue <<= 2;
    hashValue ^= charat(value, 1);
    hashValue <<= 2;
    hashValue ^= charat(value, 2);
    hashValue <<= 2;
    hashValue ^= charat(value, 3);
    return hashValue;
  }
  return 0;
};
