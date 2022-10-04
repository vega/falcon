import type { DataBase } from "./db";

export class VanillaJS implements DataBase {
    constructor(public data: { [key: string]: (number | string)[] }) {
        this.data = data;
    }
    initialize() {}
    total0D() {}
    total1D() {}
    total2D() {}
    falconIndex1D() {}
    falconIndex2D() {}
}
