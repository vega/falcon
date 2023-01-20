import { BitSet, union } from "../src/core/bitset";

describe("Bitset creation", () => {
  it("import defined", () => {
    expect(BitSet).toBeDefined();
  });

  it("construction with one integer", () => {
    const length = 1;
    const set = new BitSet(length);

    expect(set).toBeDefined();
    expect(set.length).toBe(length);
    expect(set.bits[0]).toBe(0);
  });

  it("construction spanning multiple integers", () => {
    const length = 33;
    const set = new BitSet(length);

    expect(set).toBeDefined();
    expect(set.length).toBe(length);
    expect(set.bits[0]).toBeDefined();
    expect(set.bits[1]).toBeDefined();
    expect(set.bits[0]).toBe(0);
    expect(set.bits[1]).toBe(0);
  });
});

describe("Bitset union", () => {
  it("unions two bitsets", () => {
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
