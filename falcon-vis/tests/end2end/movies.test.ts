// use the movies data to do an end to end test
import { FalconVis } from "../../src/falcon";
import { JsonDB } from "../../src/db/json";
import type { View0D, View0DState } from "../../src/views/view0D";
import type { View1D, View1DState } from "../../src/views/view1D";

describe("end to end", () => {
  let falcon: FalconVis;
  let count: View0D;
  let countState: View0DState;
  let views: View1D[] = [];
  let viewStates: View1DState[] = [];

  test("FalconVis Initialization", async () => {
    const { default: movies } = await import("./movies.json");
    const db = new JsonDB(movies);
    falcon = new FalconVis(db);
    expect(falcon).toBeDefined();
  });

  test("view Initialization", async () => {
    count = await falcon.view0D();
    const mpaa = await falcon.view1D({
      type: "categorical",
      name: "MPAA_Rating",
    });
    const usGross = await falcon.view1D({
      type: "continuous",
      name: "US_Gross",
      resolution: 400,
      bins: 20,
    });
    views = [mpaa, usGross];

    expect(count).toBeDefined();
    expect(mpaa).toBeDefined();
    expect(usGross).toBeDefined();
  });

  test("total count", async () => {
    viewStates = new Array(views.length);
    views.forEach((view, i) => {
      view.onChange((state) => {
        viewStates[i] = state;
      });
    });
    count.onChange((state) => {
      countState = state;
    });
    await falcon.link();
    expect(countState).toBeDefined();
    expect(countState["total"]).toBe(3201);
  });

  test("filtering", async () => {
    const mpaa = views[0];
    const usGross = views[1];

    await usGross.activate();
    await usGross.select([0, 200000000]);
    expect(countState["filter"]).toBe(2559);

    await mpaa.activate();
    await mpaa.select(["PG-13", "R"]);
    expect(countState["filter"]).toBe(1977);
  });

  test("reset filtering", async () => {
    const mpaa = views[0];
    const usGross = views[1];

    await usGross.activate();
    await usGross.select();
    await mpaa.activate();
    await mpaa.select();
    expect(countState["filter"]).toBe(3201);
  });

  test("entries", async () => {
    const mpaa = views[0];
    const usGross = views[1];

    await usGross.activate();
    await usGross.select();
    await usGross.select([0, 200000000]);

    await mpaa.activate();
    await mpaa.select();
    await mpaa.select(["PG-13", "R"]);

    let entries = await falcon.entries();
    let numEntries = 0;
    for (const _ of entries) {
      numEntries++;
    }
    expect(numEntries).toBe(countState["filter"]);

    entries = await falcon.entries({ offset: 0, length: 10 });
    numEntries = 0;
    for (const _ of entries) {
      numEntries++;
    }
    expect(numEntries).toBe(10);
  });
});

export {};
