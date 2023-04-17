import { View, View1D } from "./index";

/**
 * Collections of views
 * Assumes that views are unique and distinct (we don't have the same view twice here)
 */
export class ViewSet {
  views: View[];
  constructor() {
    this.views = [];
  }

  remove(viewToRemove: View) {
    const index = this.views.findIndex((view) => view == viewToRemove);
    if (index !== -1) {
      this.views.splice(index, 1);
    }
  }

  /**
   * adds view to collections
   * if view already in collection does not add it
   */
  add(viewToSave: View) {
    const notFound = this.views.findIndex((view) => view == viewToSave) === -1;

    if (notFound) {
      this.views.push(viewToSave);
    }
  }

  /**
   * @returns all the views that are not active (meaning passive)
   */
  get passive(): View[] {
    return this.views.filter((view) => !view.isActive);
  }

  /**
   * @returns the only active view, undefined if didn't find it
   */
  get active(): View1D | undefined {
    const activeView = this.views.find((view) => view.isActive);

    // if found, must be a View1D TODO extend to View2D
    if (activeView) {
      return activeView as View1D;
    } else {
      return undefined;
    }
  }

  get size(): number {
    return this.views.length;
  }

  forEach(eachView: (view: View, index: number) => void): void {
    this.views.forEach(eachView);
  }

  [Symbol.iterator](): Iterator<View> {
    return this.views[Symbol.iterator]();
  }
}
