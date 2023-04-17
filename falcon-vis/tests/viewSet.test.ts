import { ViewSet } from "../src/core/views/viewSet";
import { View1D } from "../src/core/views/view1D";

function dummyView() {
  // @ts-ignore
  const view = new View1D(null, null);
  return view;
}

describe("ViewSet", () => {
  test("Only unique views are stored in the set", () => {
    const viewset = new ViewSet();
    const firstView = dummyView();
    const secondView = dummyView();

    // duplicate view
    viewset.add(firstView);
    expect(viewset.size).toBe(1);
    viewset.add(firstView);
    expect(viewset.size).toBe(1);

    // new view
    viewset.add(secondView);
    expect(viewset.size).toBe(2);
  });

  test("At most one active view and rest passive views", () => {
    // create some views
    const viewset = new ViewSet();

    // one active view
    const active = dummyView();
    active.isActive = true;
    viewset.add(active);

    // rest passive
    viewset.add(dummyView());
    viewset.add(dummyView());

    const passiveViews = viewset.passive;
    const activeView = viewset.active;

    // only one active, rest passive
    passiveViews.forEach((view) => {
      expect(view.isActive).toBe(false);
    });
    expect(activeView?.isActive).toBe(true);
  });
});
