import type { TypedArray } from "./falconArray/falconArray";

export type Instances = Record<string, unknown[]>;
export type Indices = TypedArray;

interface InstancesInputAbstract {
  offset: number;
  length: number;
}

export type InstancesInput = InstancesInputAbstract;
