import pkg from "../package.json";

export * from "./api";
export * from "./app";
export * from "./app-rxjs";
export * from "./basic";
export * from "./config";
export * from "./db";
export * from "./util";

export const version = pkg.version;
