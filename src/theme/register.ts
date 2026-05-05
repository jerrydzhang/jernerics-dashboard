import * as echarts from "echarts";
import { mountainTheme } from "./echarts";

echarts.registerTheme("mountain", mountainTheme as Record<string, unknown>);

export { categorical } from "./echarts";
