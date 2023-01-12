import { Interval } from "../../old/basic";
import type { Falcon } from "../falcon";

type OnChange<S> = (state: S) => void;

export abstract class ViewAbstract<S extends object> {
  falcon: Falcon;
  onChangeListeners: Set<OnChange<S>>;
  isActive: boolean;
  constructor(falcon: Falcon) {
    this.falcon = falcon;
    this.onChangeListeners = new Set();
    this.isActive = false;
  }

  /**
   * returns dispose function that disposes the listener
   * you've added that listens to onChange
   */
  onChange(listener: OnChange<S>) {
    this.onChangeListeners.add(listener);
    return () => this.onChangeListeners.delete(listener);
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
  protected makeActiveView() {
    this.falcon.views.forEach((view) => {
      view.isActive = false;
    });
    this.isActive = true;
  }

  abstract all(): Promise<void> | void;
  abstract count1DIndex(activeBrushPixels?: Interval<number>): void;
}
