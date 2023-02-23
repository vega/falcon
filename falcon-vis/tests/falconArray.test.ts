import { FalconArray } from "../src/core/falconArray/falconArray";

const TypedArraysToTest = [Uint32Array, Float32Array];

describe("FalconArray Operations", () => {
  for (const ATypedArray of TypedArraysToTest) {
    test("Adding works c = a + b", () => {
      const a = new FalconArray(new ATypedArray([0, 1, -3]));
      const b = new FalconArray(new ATypedArray([0, -1, 3]));

      const c = a.add(b, ATypedArray);

      // result in c
      expect(c.data).toEqual(new ATypedArray([0, 0, 0]));

      // a and b are unchanged
      expect(a.data).toEqual(new ATypedArray([0, 1, -3]));
      expect(b.data).toEqual(new ATypedArray([0, -1, 3]));
    });

    test("Subtracting works c = a - b", () => {
      const a = new FalconArray(new ATypedArray([0, 1, -3]));
      const b = new FalconArray(new ATypedArray([0, 1, -3]));

      const c = a.sub(b, ATypedArray);

      // result in c
      expect(c.data).toEqual(new ATypedArray([0, 0, 0]));

      // a and b are unchanged
      expect(a.data).toEqual(new ATypedArray([0, 1, -3]));
      expect(b.data).toEqual(new ATypedArray([0, 1, -3]));
    });

    test("In place subtracting works a -= b", () => {
      const a = new FalconArray(new ATypedArray([0, 1, -3]));
      const b = new FalconArray(new ATypedArray([0, 1, -3]));

      a.subToItself(b);

      // result overrides a
      expect(a.data).toEqual(new ATypedArray([0, 0, 0]));

      // b is unchanged
      expect(b.data).toEqual(new ATypedArray([0, 1, -3]));
    });

    test("In place adding works a += b", () => {
      const a = new FalconArray(new ATypedArray([0, 1, -3]));
      const b = new FalconArray(new ATypedArray([0, -1, 3]));

      a.addToItself(b);

      // result overrides a
      expect(a.data).toEqual(new ATypedArray([0, 0, 0]));

      // b is unchanged
      expect(b.data).toEqual(new ATypedArray([0, -1, 3]));
    });

    test("Row and column slicing works", () => {
      /**
       * Identity Matrix
       * | 1 0 |
       * | 0 1 |
       */
      const shape = [2, 2];
      const identityMatrix = new FalconArray(
        new ATypedArray([1, 0, 0, 1]),
        shape
      );

      /**
       * slice the first row and keep all the column values
       * | 1 0 |
       */
      const rowSlice = identityMatrix.slice(0, FalconArray.ALL);

      /**
       * slice the first column and keep all the row values
       * | 1 |
       * | 0 |
       */
      const columnSlice = identityMatrix.slice(FalconArray.ALL, 0);

      // underlying data doesn't change, just the shape
      expect(rowSlice.shape).toEqual([2]);
      expect(rowSlice.data).toEqual(new ATypedArray([1, 0, 0, 1]));
      expect(columnSlice.shape).toEqual([2]);
      expect(columnSlice.data).toEqual(new ATypedArray([1, 0, 0, 1]));
    });

    test("Cumulative sum works", () => {
      /**
       * Identity Matrix
       * | 1 0 |
       * | 0 1 |
       */
      const shape = [2, 2];
      const identityMatrix = new FalconArray(
        new ATypedArray([1, 0, 0, 1]),
        shape
      );

      /**
       * expected result
       * | 1 1 |
       * | 1 2 |
       *
       * by summing right, then sum down
       * (basically sums across all dimensions)
       */
      identityMatrix.cumulativeSum();
      expect(identityMatrix.data).toEqual(new ATypedArray([1, 1, 1, 2]));
    });

    test("Incrementing works", () => {
      /**
       * Identity Matrix
       * | 1 0 |
       * | 0 1 |
       */
      const shape = [2, 2];
      let identityMatrix = new FalconArray(
        new ATypedArray([1, 0, 0, 1]),
        shape
      );

      for (let i = 0; i < 100; i++) {
        identityMatrix.increment([0, 0]);
      }
      expect(identityMatrix.get(0, 0)).toEqual(new ATypedArray([101])[0]);
    });
  }
});
