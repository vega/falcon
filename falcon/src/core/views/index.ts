export * from "./view0D";
export * from "./view1D";
export * from "./ViewCollection";

import type { View0D } from "./view0D";
import type { View1D } from "./view1D";

export type View = View0D | View1D;
