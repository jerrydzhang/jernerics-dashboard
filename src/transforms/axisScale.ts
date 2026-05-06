export type AxisScale =
  | "linear"
  | "log"
  | "log1p"
  | "symlog"
  | "negLogOneMinusX";

export function applyAxisScale(value: number, scale: AxisScale): number | null {
  switch (scale) {
    case "linear":
      return value;
    case "log":
      return value > 0 ? Math.log(value) : null;
    case "log1p":
      return value >= 0 ? Math.log1p(value) : null;
    case "symlog":
      if (value === 0) return 0;
      return value > 0 ? Math.log(value) : -Math.log(-value);
    case "negLogOneMinusX": {
      const inner = 1 - value;
      return inner > 0 ? -Math.log10(inner) : null;
    }
  }
}

export function scaleLabel(s: AxisScale): string {
  switch (s) {
    case "linear":
      return "Linear";
    case "log":
      return "Log";
    case "log1p":
      return "Log1p";
    case "symlog":
      return "Symlog";
    case "negLogOneMinusX":
      return "-log₁₀(1-x)";
  }
}

export function inverseAxisScale(value: number, scale: AxisScale): number {
  switch (scale) {
    case "linear":
      return value;
    case "log":
      return Math.exp(value);
    case "log1p":
      return Math.expm1(value);
    case "symlog":
      if (value === 0) return 0;
      return value > 0 ? Math.exp(value) : -Math.exp(-value);
    case "negLogOneMinusX":
      return 1 - 10 ** -value;
  }
}
