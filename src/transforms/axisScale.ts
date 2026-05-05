export type AxisScale = "linear" | "log" | "symlog" | "negLogOneMinusX";

export function applyAxisScale(value: number, scale: AxisScale): number | null {
  switch (scale) {
    case "linear":
      return value;
    case "log":
      return value > 0 ? Math.log(value) : null;
    case "symlog":
      if (value === 0) return 0;
      return value > 0 ? Math.log(value) : -Math.log(-value);
    case "negLogOneMinusX": {
      const inner = 1 - value;
      return inner > 0 ? -Math.log10(inner) : null;
    }
  }
}
