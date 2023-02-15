import type { Interval } from "../util";
import type { Falcon } from "../falcon";
import type { CategoricalRange } from "../dimension";

export type OnChange<S> = (state: S) => void;

export abstract class ViewAbstract<S extends object> {
  falcon: Falcon;
  onChangeListeners: Set<OnChange<S>>;
  isActive: boolean;

  /**
   * Links this new view with all other views through the falcon object
   * by default is passive (isActive = false)
   */
  constructor(falcon: Falcon) {
    this.isActive = false;
    this.linkTogetherWithOtherViews(falcon);
    this.onChangeListeners = new Set();
  }

  /**
   * fetches all the counts
   */
  abstract all(): Promise<void> | void;

  /**
   * given the active view is continuous 1D, compute the counts for this view as passive
   */
  abstract countContinuous1DIndex(activeBrushPixels?: Interval<number>): void;

  /**
   * given the active view is categorical 1D, compute the counts for this view as passive
   */
  abstract countCategorical1DIndex(
    selection?: CategoricalRange,
    totalRange?: CategoricalRange
  ): void;

  private linkTogetherWithOtherViews(falcon: Falcon) {
    this.falcon = falcon;
  }

  /**
   * calls your listener function when the counts change after filtering
   * @returns a function that removes the listener when called
   */
  onChange(listener: OnChange<S>) {
    this.onChangeListeners.add(listener);
    return () => this.onChangeListeners.delete(listener);
  }
  // new name
  addOnChangeListener(listener: OnChange<S>) {
    return this.onChange(listener);
  }

  /**
   * Calls every on change listener on the changed state
   */
  protected signalOnChange(state: S) {
    this.onChangeListeners.forEach((onChange) => {
      onChange(state);
    });
  }

  /**
   * Set all other views passive
   * and this one active
   */
  protected markThisViewActive() {
    this.falcon.views.forEach((view) => {
      view.isActive = false;
    });
    this.isActive = true;
  }
}
