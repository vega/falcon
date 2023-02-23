import { FalconArray } from "../src/core/falconArray/falconArray";

describe("FalconArray", () => {
  test("Adding works c = a + b", () => {
    const a = new FalconArray(new Uint8Array([0, 1, -3]));
    const b = new FalconArray(new Uint8Array([0, -1, 3]));

    const c = a.add(b, Uint8Array);

    // result in c
    expect(c.data).toEqual(new Uint8Array([0, 0, 0]));

    // a and b are unchanged
    expect(a.data).toEqual(new Uint8Array([0, 1, -3]));
    expect(b.data).toEqual(new Uint8Array([0, -1, 3]));
  });

  test("Subtracting works c = a - b", () => {
    const a = new FalconArray(new Uint8Array([0, 1, -3]));
    const b = new FalconArray(new Uint8Array([0, 1, -3]));

    const c = a.sub(b, Uint8Array);

    // result in c
    expect(c.data).toEqual(new Uint8Array([0, 0, 0]));

    // a and b are unchanged
    expect(a.data).toEqual(new Uint8Array([0, 1, -3]));
    expect(b.data).toEqual(new Uint8Array([0, 1, -3]));
  });

  test("In place subtracting works a -= b", () => {
    const a = new FalconArray(new Uint8Array([0, 1, -3]));
    const b = new FalconArray(new Uint8Array([0, 1, -3]));

    a.subToItself(b);

    // result overrides a
    expect(a.data).toEqual(new Uint8Array([0, 0, 0]));

    // b is unchanged
    expect(b.data).toEqual(new Uint8Array([0, 1, -3]));
  });

  test("In place adding works a += b", () => {
    const a = new FalconArray(new Uint8Array([0, 1, -3]));
    const b = new FalconArray(new Uint8Array([0, -1, 3]));

    a.addToItself(b);

    // result overrides a
    expect(a.data).toEqual(new Uint8Array([0, 0, 0]));

    // b is unchanged
    expect(b.data).toEqual(new Uint8Array([0, -1, 3]));
  });
});
