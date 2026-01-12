// src/graphs/CustomerVerbatimTrend.jsx
import React, { useMemo, useState } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    Line,
    LabelList,
} from 'recharts';
import { NoContent } from '@supportninja/ui-components';


export function CustomLegend({
  payload = [],
  hiddenKeys = {},
  onToggle,
}) {
  if (!payload?.length) return null;

  return (
    <div className="pointer-events-auto !font-sans mx-auto mb-1 flex w-fit max-w-full flex-wrap items-center justify-center gap-2 rounded-xl bg-white/70 px-2 py-1.5 shadow-md ring-1 ring-black/5 backdrop-blur-md dark:bg-slate-900/60 dark:ring-white/10">
      {payload.map(({ value, color, id, dataKey }) => {
        const key = id ?? dataKey ?? value;
        const hidden = !!hiddenKeys[key];

        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle?.(key)}
            aria-pressed={!hidden}
            title={hidden ? `Show ${value}` : `Hide ${value}`}
            className={[
              'group flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition',
              'ring-1 ring-black/5 dark:ring-white/10 shadow-sm',
              'bg-white/60 hover:bg-white/80 dark:bg-slate-800/60 dark:hover:bg-slate-800/80',
              hidden ? 'opacity-50 grayscale-[.2]' : 'opacity-90 hover:opacity-100',
            ].join(' ')}
          >
            <span
              className="inline-flex h-2.5 w-2.5 flex-none items-center justify-center rounded-sm ring-2 ring-white/60"
              style={{ background: color }}
              aria-hidden="true"
            />
            <span className="whitespace-nowrap font-medium text-slate-700 dark:text-slate-200">
              {value}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const COLORS = {
    positive: '#4AB58E',
    neutral: '#F8B603',
    negative: '#EE4B4A',
    grid: '#E5E7EB',
    axis: '#6B7280',
    title: '#0B1454',
};

// Parse a YYYY-MM-DD as UTC
const parseISODateUTC = (s) => {
    const [y, m, d] = String(s).split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d));
};

const fmtShort = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
});
const fmtFull = new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
});

// Pretty, modern tooltip for Recharts
const CustomTooltip = ({ active, label, payload }) => {
    if (!active || !payload || !payload.length) return null;

    const dt = parseISODateUTC(label);
    const labelText = dt ? fmtFull.format(dt) : String(label);

    const order = ['positive', 'neutral', 'negative'];
    const nameMap = {
        positive: 'Positive',
        neutral: 'Neutral',
        negative: 'Negative',
    };

    const rows = order
        .map((key) => {
            const p = payload.find((x) => x?.dataKey === key);
            if (!p || p.value == null) return null;
            return {
                key,
                label: nameMap[key],
                value: Number(p.value) || 0,
                color: COLORS[key],
            };
        })
        .filter(Boolean);

    const total = rows.reduce((sum, r) => sum + (r?.value || 0), 0);

    return (
        <div className="pointer-events-none rounded-xl border border-slate-200/70 bg-white/80 shadow-xl ring-1 ring-black/5 backdrop-blur-md">
            <div className="px-3.5 py-3">
                <div className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                    {labelText}
                </div>

                <div className="mt-2 flex items-center justify-between text-[12px] text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-slate-300" />
                        Total
                    </span>
                    <span className="font-semibold text-slate-900">
                        {total.toLocaleString()}
                    </span>
                </div>

                <div className="mt-1.5 divide-y divide-slate-100">
                    {rows.map((r) => (
                        <div key={r.key} className="py-1.5 flex items-center justify-between">
                            <span className="inline-flex items-center gap-2 text-[12px] text-slate-600">
                                <span
                                    className="inline-block h-2.5 w-2.5 rounded-sm"
                                    style={{ backgroundColor: r.color }}
                                />
                                {r.label}
                            </span>
                            <span
                                className="font-semibold text-[13px]"
                                style={{ color: r.color }}
                            >
                                {r.value.toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Always-rotated tick; nudge last label left so it doesn't clip
const RotatedTick = ({
    x,
    y,
    payload,
    color = COLORS.axis,
    fontSize = 12,
    angle = -35,
    lastValue,
    shiftLast = 14,
}) => {
    const dt = parseISODateUTC(payload?.value);
    const label = dt ? fmtShort.format(dt) : String(payload?.value ?? '');
    const isLast = lastValue != null && String(payload?.value) === String(lastValue);
    const dx = isLast ? -shiftLast : 0;

    return (
        <g transform={`translate(${x + dx},${y})`}>
            <text
                dy={12}
                textAnchor="end"
                fill={color}
                fontSize={fontSize}
                transform={`rotate(${angle})`}
            >
                {label}
            </text>
        </g>
    );
};

// Value labels for each point; slight per-series offsets to reduce overlap
const valueLabel = (series) => (props) => {
    const { x, y, value } = props;
    if (value == null) return null;
    const colorMap = { positive: COLORS.positive, neutral: COLORS.neutral, negative: COLORS.negative };
    const dyMap = { positive: -12, neutral: -26, negative: 14 };
    return (
        <text x={x} y={y + (dyMap[series] ?? -12)} fill={colorMap[series]} fontSize={11} textAnchor="middle">
            {value}
        </text>
    );
};

export default function CustomerVerbatimTrend({ data = {} }) {
    // Normalize API object -> [{ date: 'YYYY-MM-DD', positive, neutral, negative }]
    const rows = useMemo(() => {
        if (!data || typeof data !== 'object') return [];
        const entries = Object.entries(data).filter(([k]) => parseISODateUTC(k));
        entries.sort(([a], [b]) => parseISODateUTC(a) - parseISODateUTC(b));
        return entries.map(([date, v]) => {
            const positive = Number(v?.positive ?? v?.Positive ?? 0) || 0;
            const neutral = Number(v?.neutral ?? v?.Neutral ?? 0) || 0;
            const negative = Number(v?.negative ?? v?.Negative ?? 0) || 0;
            return { date, positive, neutral, negative };
        });
    }, [data]);
    const [hidden, setHidden] = useState({});

  const toggleKey = (key) =>
    setHidden(prev => ({ ...prev, [key]: !prev[key] }));

    if (rows.length === 0) {
        return (
            <div className="panel graph--verbatim-trend !shadow-md">
                <NoContent className="!w-full !h-full" />
            </div>
        );
    }

    // Dynamic Y max with headroom
    const yMax = Math.max(
        1,
        ...rows.map(r => Math.max(r.positive || 0, r.neutral || 0, r.negative || 0))
    );
    const domainMax = Math.ceil(yMax * 1.1);

    return (
        <div className="panel graph--verbatim-trend !shadow-md">
            <div className="panel__title" style={{ color: COLORS.title, fontSize: 16 }}>
                Customer Verbatim Trend
            </div>
            <div className="chart-box" style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={rows}
                        style={{ fontFamily: 'Work Sans' }}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }} // extra right/bottom space
                    >
                        <CartesianGrid stroke={COLORS.grid} />

                        <XAxis
                            dataKey="date"
                            interval={0}                 // show ALL labels
                            minTickGap={0}
                            height={64}
                            tickMargin={8}
                            padding={{ left: 0, right: 1 }}  // head/tail padding so last label has room
                            tick={
                                <RotatedTick
                                    angle={0}
                                    lastValue={rows[rows.length - 1]?.date}
                                    shiftLast={4}
                                />
                            }
                            axisLine={{ stroke: '#EEF2F7' }}
                            tickLine={false}
                        />

                        <YAxis
                            domain={[0, domainMax]}
                            allowDecimals={false}
                            tick={{ fill: COLORS.axis, fontSize: 13 }}
                            tickMargin={8}
                            axisLine={{ stroke: '#EEF2F7' }}
                            tickLine={false}
                            label={{
                                value: 'Mentions',
                                angle: -90,
                                position: 'insideLeft',
                                offset: 10,
                                fill: COLORS.axis,
                                fontSize: 12,
                            }}
                        />

                       <Tooltip
                            content={<CustomTooltip />}
                            wrapperStyle={{ outline: 'none' }}
                            cursor={{ stroke: '#94A3B8', strokeDasharray: '4 4', strokeWidth: 1 }}
/>

                        {/* <Legend
                            verticalAlign="bottom"
                            align="center"
                            iconType="square"
                            wrapperStyle={{ paddingTop: 0, fontSize: 12 }}
                            payload={[
                                { value: 'Positive Mentions', type: 'square', color: COLORS.positive, id: 'positive' },
                                { value: 'Neutral Mentions', type: 'square', color: COLORS.neutral, id: 'neutral' },
                                { value: 'Negative Mentions', type: 'square', color: COLORS.negative, id: 'negative' },
                            ]}
                        /> */}

                        <Legend
                            verticalAlign="bottom"
                            align="center"
                            wrapperStyle={{ paddingTop: 0 }}
                            payload={[
                            { value: 'Positive Mentions', type: 'square', color: COLORS.positive, id: 'positive' },
                            { value: 'Neutral Mentions', type: 'square', color: COLORS.neutral, id: 'neutral' },
                            { value: 'Negative Mentions', type: 'square', color: COLORS.negative, id: 'negative' },
                            ]}
                            content={<CustomLegend hiddenKeys={hidden} onToggle={toggleKey} />}
          />

                        <Line
                            type="monotone"
                            dataKey="positive"
                            name="Positive Mentions"
                            stroke={COLORS.positive}
                            strokeWidth={3}
                            dot={{ r: 3, stroke: '#fff', strokeWidth: 1, fill: COLORS.positive }}
                            activeDot={{ r: 5 }}
                            hide={!!hidden.positive}
                        >
                            <LabelList content={valueLabel('positive')} />
                        </Line>

                        <Line
                            type="monotone"
                            dataKey="neutral"
                            name="Neutral Mentions"
                            stroke={COLORS.neutral}
                            hide={!!hidden.neutral}
                            strokeWidth={3}
                            dot={{ r: 3, stroke: '#fff', strokeWidth: 1, fill: COLORS.neutral }}
                            activeDot={{ r: 5 }}
                        >
                            <LabelList content={valueLabel('neutral')} />
                        </Line>

                        <Line
                            type="monotone"
                            dataKey="negative"
                            name="Negative Mentions"
                            stroke={COLORS.negative}
                            strokeWidth={3}
                            dot={{ r: 3, stroke: '#fff', strokeWidth: 1, fill: COLORS.negative }}
                            activeDot={{ r: 5 }}
                            hide={!!hidden.negative}
                        >
                            <LabelList content={valueLabel('negative')} />
                        </Line>
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}