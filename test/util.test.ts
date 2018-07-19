import ndarray from "ndarray";
import { _chEmd, chEmd } from "./../src/util";

describe("emb", () => {
  const a = [1, 2, 4, 6, 7, 8];
  const b = [0, 3, 3, 4, 5, 7];

  // https://colab.research.google.com/drive/1wLWvtd0rfKcqZJK2kch9CGww3p5QrZhG
  const emd = 0.7142857142857143;

  test("cumulative histogram emd is correct", () => {
    expect(_chEmd(ndarray(a), ndarray(b), 8, 7)).toBe(emd);
  });

  test("exposed emd produces the same result", () => {
    expect(chEmd(ndarray(a), ndarray(b))).toBe(emd);
  });

  test("emd works for views", () => {
    expect(
      chEmd(ndarray([1, 2, 4, 6, 7, 8], [6]), ndarray([0, 3, 3, 4, 5, 7], [6]))
    ).toBe(emd);

    expect(
      chEmd(
        ndarray([1, 2, 4, 6, 7, 8, 1, 2], [6]),
        ndarray([0, 3, 3, 4, 5, 7, 8, 9], [6])
      )
    ).toBe(emd);
  });
});
