/** 与后端一致的字段约束：L* 闭区间 [0,100]，a 与 b 轴闭区间 [-128,127]。 */
export const COMPONENT_BOUNDS = {
  L: { min: 0, max: 100, label: "L*", greek: "L*" },
  a: { min: -128, max: 127, label: "a*", greek: "a*" },
  b: { min: -128, max: 127, label: "b*", greek: "b*" },
} as const;

export type ComponentKey = keyof typeof COMPONENT_BOUNDS;
export type ColorKey = "standard" | "sample";

export interface LabInput {
  L: string;
  a: string;
  b: string;
}

export type LabForm = Record<ColorKey, LabInput>;

export interface FieldError {
  field: string;
  message: string;
}

export interface DeltaEResult {
  delta_e00: number;
  delta_e00_round: number;
  threshold: number;
  passed: boolean;
  excess_raw: number;
  excess_round: number;
  relation: "<=" | ">";
}

export interface DeltaESuccessResponse {
  ok: true;
  standard: { L: number; a: number; b: number };
  sample: { L: number; a: number; b: number };
  result: DeltaEResult;
}

export interface DeltaEErrorResponse {
  ok: false;
  message: string;
  errors: FieldError[];
}

export const THRESHOLD = 2.0;
export const EMPTY_FORM: LabForm = {
  standard: { L: "", a: "", b: "" },
  sample: { L: "", a: "", b: "" },
};
