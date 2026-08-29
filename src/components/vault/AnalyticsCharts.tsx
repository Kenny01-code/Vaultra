import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

export type KindSlice = { kind: string; files: number; bytes: number };
export type TrendPoint = { label: string; files: number; bytes: number };

const SHADES = [
  "oklch(0.985 0 0)",
  "oklch(0.86 0 0)",
  "oklch(0.72 0 0)",
  "oklch(0.58 0 0)",
  "oklch(0.44 0 0)",
  "oklch(0.32 0 0)",
];

const AXIS = { stroke: "oklch(0.7 0 0)", fontSize: 11 } as const;

function ChartTooltip({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; payload?: KindSlice }[];
  label?: string | number;
  metric: "bytes" | "files";
}) {
  if (!active || !payload?.length) return null;
  const first = payload[0];
  const value = Number(first?.value ?? 0);
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-xs shadow-[var(--shadow-card)]">
      <p className="font-medium">{first?.payload?.kind ?? label}</p>
      <p className="mt-0.5 text-muted-foreground">
        {metric === "bytes" ? formatBytes(value) : `${value} files`}
      </p>
    </div>
  );
}

/**
 * Premium monochrome analytics: distribution (pie), composition (bar) and
 * growth (line) in one card, with a live metric switch between storage bytes
 * and file counts.
 */
export function AnalyticsCharts({
  kinds,
  trend,
  className,
}: {
  kinds: KindSlice[];
  trend: TrendPoint[];
  className?: string;
}) {
  const [metric, setMetric] = useState<"bytes" | "files">("bytes");
  const data = useMemo(
    () => kinds.filter((kind) => (metric === "bytes" ? kind.bytes > 0 : kind.files > 0)),
    [kinds, metric],
  );

  const empty = data.length === 0;

  return (
    <section
      className={cn(
        "glass rounded-3xl p-4 shadow-[var(--shadow-card)] sm:p-6",
        className,
      )}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base font-semibold sm:text-lg">Storage analytics</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Distribution, composition and growth across every account.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-border/70 bg-surface/60 p-1">
          {(["bytes", "files"] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={metric === value ? "secondary" : "ghost"}
              className="h-8 rounded-full px-3 text-xs"
              onClick={() => setMetric(value)}
            >
              {value === "bytes" ? "Storage" : "Files"}
            </Button>
          ))}
        </div>
      </header>

      {empty ? (
        <p className="mt-8 text-sm text-muted-foreground">No data yet — upload a file to populate the charts.</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey={metric}
                  nameKey="kind"
                  innerRadius="52%"
                  outerRadius="80%"
                  paddingAngle={3}
                  stroke="oklch(0.13 0 0)"
                  strokeWidth={2}
                  animationDuration={900}
                >
                  {data.map((slice, index) => (
                    <Cell key={slice.kind} fill={SHADES[index % SHADES.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip metric={metric} />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  formatter={(value: string) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
                <XAxis dataKey="kind" tickLine={false} axisLine={false} tick={AXIS} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={AXIS}
                  width={54}
                  tickFormatter={(value: number) =>
                    metric === "bytes" ? formatBytes(value) : String(value)
                  }
                />
                <Tooltip
                  cursor={{ fill: "oklch(1 0 0 / 0.05)" }}
                  content={<ChartTooltip metric={metric} />}
                />
                <Bar dataKey={metric} radius={[8, 8, 0, 0]} animationDuration={900}>
                  {data.map((slice, index) => (
                    <Cell key={slice.kind} fill={SHADES[index % SHADES.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {trend.length > 1 ? (
            <div className="h-56 lg:col-span-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                    width={54}
                    tickFormatter={(value: number) =>
                      metric === "bytes" ? formatBytes(value) : String(value)
                    }
                  />
                  <Tooltip content={<ChartTooltip metric={metric} />} />
                  <Line
                    type="monotone"
                    dataKey={metric}
                    stroke="oklch(0.985 0 0)"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: "oklch(0.985 0 0)" }}
                    activeDot={{ r: 4 }}
                    animationDuration={1100}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
