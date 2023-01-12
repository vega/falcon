export * from "./view0D";
export * from "./view1D";
export * from "./view2D";

import type { View0D } from "./view0D";
import type { View1D } from "./view1D";
import type { View2D } from "./view2D";
export type View = View0D | View1D | View2D;
