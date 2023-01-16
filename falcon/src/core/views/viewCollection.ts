import { View } from "./index";

/**
 * Collections of views
 * Assumes that views are unique and distinct (we don't have the same view twice here)
 * Perhaps change this to set later
 *
 * I have this an array right now because I directly use the array
 * in other functions
 */
export class ViewCollection {
  views: View[];
  constructor() {
    this.views = [];
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

  get passive(): View[] {
    return this.views.filter((view) => !view.isActive);
  }

  get active(): View {
    return this.views.filter((view) => view.isActive)[0];
  }

  forEach(eachView: (view: View, index: number) => void): void {
    this.views.forEach(eachView);
  }
}
