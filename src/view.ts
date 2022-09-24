import type { Falcon } from "./falcon";
import type {
	ViewMode,
	Dimension,
	ViewOnUpdateCallback,
	ViewConstructor,
} from "./api";

/**
 * A cross filterable view that can be directly
 * interacted with by the user.
 */
export class View {
	protected mode: ViewMode;
	protected falcon: Falcon;
	dimensions?: Dimension[];
	onUpdate?: ViewOnUpdateCallback;

	constructor(config: ViewConstructor) {
		this.dimensions = config.dimensions;
		this.onUpdate = config.onUpdate;
		this.mode = "passive";
	}

	/**
	 * For anything to be done, this View must have access to the data
	 * This method is called in the falcon.ts add(view) method
	 */
	_connectFalconViews(falcon: Falcon) {
		this.falcon = falcon;
	}

	/**
	 * Prefetch data tiles based on mode (active or passive)
	 */
	prefetch() {
		console.log("prefetch()");
	}

	/**
	 * Filter using the falcon data tiles based on mode (active or passive)
	 */
	filter(...args: any[]) {
		this.makeActive();
		console.log("filter()");
	}

	/**
	 * Make this view active and rest passive
	 */
	protected makeActive() {
		this.mode = "active";
		this.otherViews?.forEach((view) => view.makePassive());
	}
	protected makePassive() {
		this.mode = "passive";
	}

	get otherViews() {
		if (this.falcon) {
			return this.falcon.views.filter((view) => view !== this);
		}
	}
}
