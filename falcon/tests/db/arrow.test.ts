import { ArrowDB } from "../../src/core/db/arrow";
import { Table, tableFromArrays } from "apache-arrow";
import type { Dimension } from "../../src/core/dimension";

/**
 * Dummy table for testing purposes
 *
 * @returns arrow table with columns = ['integers', 'random']
 */
function dummyArrowTable(length: number) {
  const columnarObj = {
    integers: new Array(length).fill(0).map((_, i) => i),
    random: new Array(length).fill(0).map(() => Math.random()),
  };
  const arrowTable = tableFromArrays(columnarObj);
  return arrowTable;
}

describe("Falcon ArrowDB", () => {
  const knownTableLength = 100;
  const arrowTable = dummyArrowTable(knownTableLength);

  it("should import correctly", () => {
    expect(ArrowDB).toBeDefined();
  });

  it("should construct correctly", () => {
    const arrowDB = new ArrowDB(arrowTable);

    expect(arrowDB).toBeDefined();
    expect(arrowDB.blocking).toBeTruthy();
    expect(arrowDB.data).toBeInstanceOf(Table);
  });

  it("should show the same length as the arrow table", () => {
    const arrowDB = new ArrowDB(arrowTable);
    const observedTableLength = arrowDB.length();

    expect(observedTableLength).toBeDefined();
    expect(observedTableLength).toBe(knownTableLength);
  });

  it("should correctly compute extent given a dimension", () => {
    const randomDimension = {
      type: "continuous",
      name: "random",
    } as Dimension;
    const integerDimension = {
      type: "continuous",
      name: "integers",
    } as Dimension;

    const arrowDB = new ArrowDB(arrowTable);
    const randomExtent = arrowDB.extent(randomDimension);
    const integerExtent = arrowDB.extent(integerDimension);

    expect(integerExtent).toBeDefined();
    expect(randomExtent).toBeDefined();

    expect(integerExtent[0]).toBe(0);
    expect(integerExtent[1]).toBe(knownTableLength - 1);

    expect(randomExtent[0]).toBeGreaterThanOrEqual(0);
    expect(randomExtent[1]).toBeLessThanOrEqual(1);
  });
});
