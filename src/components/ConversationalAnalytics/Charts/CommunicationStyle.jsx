// src/graphs/CommunicationStyleImpact.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Bar,
    Cell,
} from 'recharts';
import { isEmptyObject, hasObjectData } from '../../common/strings';
import { NoContent } from '@supportninja/ui-components';
const COLORS = {
    bar: '#4AB58E',  // single color
    grid: '#E5E7EB',
    axis: '#6B7280',
    title: '#0B1454',
};

// Wrap to 2 lines if needed
const TwoLineTick = ({ x, y, payload, fontSize = 13, color = COLORS.axis }) => {
    const text = String(payload?.value ?? '');
    const parts = text.split(/[\s-]/).filter(Boolean);
    const mid = Math.ceil(parts.length / 2);
    const lines = [parts.slice(0, mid).join(' '), parts.slice(mid).join(' ')].filter(Boolean);
    return (
        <g transform={`translate(${x},${y})`}>
            <text textAnchor="middle" fill={color} fontSize={fontSize}>
                {lines.map((t, i) => (
                    <tspan key={i} x="0" dy={i === 0 ? 14 : 12}>{t}</tspan>
                ))}
            </text>
        </g>
    );
};

function useSize() {
    const ref = useRef(null);
    const [w, setW] = useState(0);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const update = () => setW(el.getBoundingClientRect().width || 0);
        update();
        let ro;
        if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(update);
            ro.observe(el);
        } else {
            window.addEventListener('resize', update);
        }
        return () => {
            if (ro) ro.disconnect();
            else window.removeEventListener('resize', update);
        };
    }, []);
    return [ref, w];
}

const getBarColor = (label = '') => {
  const v = String(label).toLowerCase();

  if (v.includes('detractor')) return '#EE4B4A'; // red
  if (v.includes('promoter')) return '#4AB58E';  // green
  if (v.includes('passive')) return '#F4C542';   // yellow

  // fallback
  return barColor;
};

const toTitleCase = (s = '') =>
    s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

function normalizeData(input) {
    // Accept object or array; merge case-insensitive keys
    const map = new Map();
    if (Array.isArray(input)) {
        for (const row of input) {
            const raw = String(row?.name ?? '').trim();
            if (!raw) continue;
            const k = raw.toLowerCase();
            const v = Number(row?.value ?? 0) || 0;
            const prev = map.get(k)?.value || 0;
            map.set(k, { name: toTitleCase(raw), value: prev + v });
        }
    } else if (input && typeof input === 'object') {
        for (const [rawKey, rawVal] of Object.entries(input)) {
            const raw = String(rawKey ?? '').trim();
            if (!raw) continue;
            const k = raw.toLowerCase();
            const v = Number(rawVal ?? 0) || 0;
            const prev = map.get(k)?.value || 0;
            map.set(k, { name: toTitleCase(raw), value: prev + v });
        }
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
}

export default function CommunicationStyleImpact({
    data = {},
    title = 'Communication Style Impact',
    barColor = COLORS.bar,
}) {
    const [boxRef, width] = useSize();
    const rows = useMemo(() => normalizeData(data), [data]);

    const count = Math.max(1, rows.length);
    const band = width ? width / count : 140;
    const wrap = band < 130;
    const xHeight = wrap ? 48 : 24;

    // Let container decide bar width: use percentage gaps that scale with width
    const barCategoryGap = count >= 10 ? '12%' : count >= 6 ? '18%' : '26%'; // tweak as desired
    const barGap = 4;              // gap between bars in same category (single series)
    const maxBarSize = 80;         // optional: cap very thick bars on wide screens

    const total = rows.reduce((s, r) => s + (r.value || 0), 0);

    if (isEmptyObject(data)) {
        return (
            <div className="panel graph--communication-impact !shadow-md font-sans">
                <div className="panel__title" style={{ color: COLORS.title, fontSize: 16 }}>
                    {title}
                </div>
                <div className='mb-[6px]'>
                    <NoContent className='!w-full !h-full' />
                </div>
            </div>
        )
    }

    return (
        <div className="panel graph--communication-impact !shadow-md font-sans">
            <div className="panel__title" style={{ color: COLORS.title, fontSize: 16 }}>
                {title}
            </div>

            <div className="chart-box" ref={boxRef} style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={rows}
                        margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                        barCategoryGap={barCategoryGap}  // responsive spacing
                        barGap={barGap}
                    >
                        <CartesianGrid strokeDasharray="0" stroke={COLORS.grid} />

                        <XAxis
                            dataKey="name"
                            interval={0}
                            minTickGap={0}
                            height={xHeight}
                            tickMargin={10}
                            tick={wrap ? <TwoLineTick /> : { fill: COLORS.axis, fontSize: 13 }}
                            tickLine={false}
                            axisLine={{ stroke: '#EEF2F7' }}
                        />

                        <YAxis
                            domain={[0, (dataMax) => Math.ceil(dataMax * 1.1)]}
                            allowDecimals={false}
                            tick={{ fill: COLORS.axis, fontSize: 13 }}
                            tickMargin={6}
                            axisLine={{ stroke: '#EEF2F7' }}
                            tickLine={false}
                            label={{
                                value: 'Count',
                                angle: -90,
                                position: 'insideLeft',
                                offset: 8,
                                fill: COLORS.axis,
                                fontSize: 12,
                            }}
                        />

                        <Tooltip
                            formatter={(value) => {
                                const v = Number(value) || 0;
                                const pct = total ? Math.round((v / total) * 100) : 0;
                                return [`${v} (${pct}%)`, 'Count'];
                            }}
                            labelFormatter={(label) => label}
                            contentStyle={{
                                background: '#121826',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 10,
                                boxShadow: '0 8px 20px rgba(0,0,0,.25)',
                                fontSize: 12,
                                padding: '10px 12px',
                            }}
                        />

                        <Bar
                            dataKey="value"
                            name="Count"
                            radius={[8, 8, 8, 8]}
                            maxBarSize={maxBarSize}
                            >
                            {rows.map((r, idx) => (
                                <Cell key={`cell-${idx}`} fill={getBarColor(r.name)} />
                            ))}
                        </Bar>
                    </BarChart>



                </ResponsiveContainer>
            </div>
        </div>
    );
}