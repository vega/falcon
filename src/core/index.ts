import type { DataBase } from "../db";

export class Falcon<V extends string, D extends string> {
    protected db: DataBase<V, D>;
    constructor(db: DataBase<V, D>) {
        this.db = db;
        this.initDB();
    }
    async initDB() {
        if (this.db) {
            await this.db.initialize();
        }
    }
}
