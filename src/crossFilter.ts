type CrossFilterMode = "active" | "passive";

export class CrossFilter {
	readonly name: string;
	protected mode: CrossFilterMode;
	constructor(name: string) {
		this.name = name;
		this.mode = "passive";
	}
	filter(...args) {
		console.log(args);
		console.log("CrossFilter.filter() called");
	}
	prefetch() {
		console.log("prefetched index");
	}
	makeActive() {
		this.mode = "active";
	}
	protected makePassive() {
		this.mode = "passive";
	}
}
