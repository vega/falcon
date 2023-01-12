import { BitSet, union } from "../src/old/bitset";
import { omit, repeatInvisible } from "../src/old/util";

describe("union", () => {
  test("unions two bitsets", () => {
    const set1 = new BitSet(5);
    set1.set(0, true).set(1, true).set(2, true);
    const set2 = new BitSet(5);
    set2.set(1, true).set(2, true).set(4, true);
    const set = union(set1, set2)!;

    expect(set.get(0)).toBeTruthy();
    expect(set.get(1)).toBeTruthy();
    expect(set.get(2)).toBeTruthy();
    expect(set.get(3)).toBeFalsy();
    expect(set.get(4)).toBeTruthy();

    expect(set1.get(0)).toBeTruthy();
    expect(set1.get(1)).toBeTruthy();
    expect(set1.get(2)).toBeTruthy();
    expect(set1.get(3)).toBeFalsy();
    expect(set1.get(4)).toBeFalsy();

    expect(set2.get(0)).toBeFalsy();
    expect(set2.get(1)).toBeTruthy();
    expect(set2.get(2)).toBeTruthy();
    expect(set2.get(3)).toBeFalsy();
    expect(set2.get(4)).toBeTruthy();
  });
});

describe("omit", () => {
  test("omit does not change original map", () => {
    const original = new Map<number, number>();
    original.set(1, 1);
    original.set(2, 2);
    original.set(3, 3);
    original.set(4, 4);
    const copy = omit(original, 2, 3);
    expect([...original.keys()]).toEqual([1, 2, 3, 4]);
    expect([...copy.keys()]).toEqual([1, 4]);
  });
});

describe("repeatInvisible", () => {
  test("simple case", () => {
    expect(repeatInvisible([1, 2, 3, 4, 5, 6, 7, 8, 9], 3.5, 8.5)).toEqual([
      4, 4, 4, 4, 5, 6, 7, 8, 8,
    ]);
  });
});
