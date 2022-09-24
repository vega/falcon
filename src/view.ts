import type { Falcon } from "./falcon";
type ViewMode = "active" | "passive";

type Bin = { filteredCount: number; count: number };
type Bins = Bin[];
interface Dimension {
	name: string;
}
interface UpdateDimension extends Dimension {
	bins: Bins;
}
type ViewOnUpdateCallback = (state: UpdateDimension[]) => void; // dimensions x bins
// update is a callback that will return
interface ViewConstructor {
	dimensions?: Dimension[];
	onUpdate?: ViewOnUpdateCallback;
}

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
	filter(...args: any[]) {
		this.makeActive();
		if (this.onUpdate) {
			this.onUpdate([]);
		}
		console.log("filter()");
	}
	prefetch() {
		console.log("prefetch()");
	}
	/**
	 * Make this view active and rest passive
	 */
	protected makeActive() {
		this.mode = "active";
		this.falcon.views.forEach((view) => {
			if (view !== this) {
				view.makePassive();
			}
		});
	}
	protected makePassive() {
		this.mode = "passive";
	}
	_connectGlobalFalcon(falcon: Falcon) {
		this.falcon = falcon;
	}
}
