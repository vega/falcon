import type { CrossFilter } from "./crossFilter";

export class Falcon {
	crossFilters: CrossFilter[];
	data: any;
	constructor(data: any) {
		console.log("Falcon constructed");
		this.crossFilters = [];
		this.data = data;
	}
	add(...newCrossFilters: CrossFilter[]) {
		newCrossFilters.forEach((crossFilter) => {
			this.crossFilters.push(crossFilter);
		});
	}
	filter(crossFilter: CrossFilter, ...args) {
		crossFilter.filter();
	}
}
