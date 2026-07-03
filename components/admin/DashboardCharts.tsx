"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chart } from "@/lib/chart-colors";

const tick = { fontSize: 11, fill: chart.tick };
const tooltipStyle = {
  borderRadius: 16,
  border: `2px solid ${chart.grid}`,
  background: chart.surface,
  fontSize: 12,
};

export function CreditTrendChart({
  data,
  label,
}: {
  data: { month: string; credits: number }[];
  label: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="creditFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chart.navy} stopOpacity={0.28} />
            <stop offset="100%" stopColor={chart.navy} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={chart.grid} vertical={false} />
        <XAxis dataKey="month" tick={tick} axisLine={false} tickLine={false} />
        <YAxis tick={tick} axisLine={false} tickLine={false} width={34} />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ stroke: chart.grid, strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="credits"
          name={label}
          stroke={chart.navy}
          strokeWidth={2}
          fill="url(#creditFill)"
          dot={{ r: 3.5, fill: chart.navy, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBarsChart({
  data,
}: {
  data: { name: string; value: number; fill: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={data.length * 46 + 24}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 44, left: 0, bottom: 0 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ ...tick, fill: chart.ink }}
          width={118}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "rgba(228, 224, 216, 0.35)" }}
        />
        <Bar
          dataKey="value"
          barSize={16}
          radius={[0, 4, 4, 0]}
          background={{ fill: chart.track, radius: 8 }}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.fill} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            style={{ fontSize: 11, fill: chart.ink, fontWeight: 700 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DistributionChart({
  data,
}: {
  data: { name: string; value: number; fill: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <RadialBarChart
        data={data}
        innerRadius="32%"
        outerRadius="100%"
        startAngle={90}
        endAngle={-270}
      >
        <RadialBar
          dataKey="value"
          cornerRadius={8}
          background={{ fill: chart.track }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}

export function GroupedBarsChart({
  data,
  series,
}: {
  data: Record<string, string | number>[];
  series: { key: string; label: string; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
        barGap={2}
      >
        <CartesianGrid stroke={chart.grid} vertical={false} />
        <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
        <YAxis
          tick={tick}
          axisLine={false}
          tickLine={false}
          width={34}
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "rgba(228, 224, 216, 0.35)" }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color}
            barSize={10}
            radius={[3, 3, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function WeekAttendanceChart({
  data,
}: {
  data: { label: string; rate: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={chart.grid} vertical={false} />
        <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
        <YAxis
          tick={tick}
          axisLine={false}
          tickLine={false}
          width={34}
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "rgba(228, 224, 216, 0.35)" }}
        />
        <Bar dataKey="rate" fill={chart.navy} barSize={28} radius={[4, 4, 0, 0]}>
          <LabelList
            dataKey="rate"
            position="top"
            style={{ fontSize: 10, fill: chart.tick }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
