// SentimentDonutRowOneRow.jsx
import React, { useMemo, useLayoutEffect, useRef, useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { toTitleCase } from '../../common/strings';

const COLORS = {
    Positive: '#4AB58E',
    Negative: '#EE4B4A',
    Neutral: '#F8B603',
};

function compact(n) {
    if (!n) return '0';
    try {
        return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
    } catch {
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
        return String(n);
    }
}

// Optional: tiny util to make a translucent version of a HEX color
function hexToRgba(hex, alpha = 0.15) {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean.length === 3
        ? clean.split('').map(c => c + c).join('')
        : clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Stylish, modern tooltip content
function CustomTooltip({ active, payload }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (active) {
            // trigger a subtle fade/slide on mount
            const t = requestAnimationFrame(() => setMounted(true));
            return () => cancelAnimationFrame(t);
        } else {
            setMounted(false);
        }
    }, [active]);

    if (!active || !payload?.length) return null;

    const p = payload[0];
    const name = p?.name ?? p?.payload?.name ?? '';
    const value = Number(p?.value ?? 0);
    const percent = typeof p?.percent === 'number' ? Math.max(0, Math.min(1, p.percent)) : null;
    const pctText = percent != null ? `${Math.round(percent * 100)}%` : '';
    const color = p?.payload?.color ?? p?.fill ?? '#111827';
    const categoryTitle = p?.payload?._title ? toTitleCase(p.payload._title) : '';

    return (
        <div
            style={{
                pointerEvents: 'none',
                background: 'rgba(255,255,255,0.96)',
                backdropFilter: 'saturate(180%) blur(8px)',
                border: '1px solid rgba(17,24,39,0.08)',
                borderRadius: 12,
                boxShadow: '0 12px 28px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                color: '#111827',
                padding: '12px 14px',
                minWidth: 180,
                maxWidth: 280,
                transform: mounted ? 'translateY(0px)' : 'translateY(4px)',
                opacity: mounted ? 1 : 0,
                transition: 'opacity 140ms ease-out, transform 140ms ease-out',
            }}
        >
            {categoryTitle ? (
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, letterSpacing: 0.2 }}>
                    {categoryTitle}
                </div>
            ) : null}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                    style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: color,
                        boxShadow: `0 0 0 3px ${hexToRgba(color, 0.18)}`,
                    }}
                />
                <div style={{ fontWeight: 600 }}>{name}</div>
                <div style={{ marginLeft: 'auto', fontWeight: 700 }}>{pctText}</div>
            </div>

            <div style={{ marginTop: 6, fontSize: 13, color: '#4b5563' }}>
                {compact(value)} total
            </div>

            {percent != null ? (
                <div
                    style={{
                        marginTop: 10,
                        height: 6,
                        background: '#f3f4f6',
                        borderRadius: 9999,
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            width: `${Math.round(percent * 100)}%`,
                            height: '100%',
                            background: `linear-gradient(90deg, ${hexToRgba(color, 0.9)} 0%, ${color} 100%)`,
                            borderRadius: 9999,
                            transition: 'width 200ms ease-out',
                        }}
                    />
                </div>
            ) : null}
        </div>
    );
}

// Hook to measure an element
function useElementSize() {
    const ref = useRef(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    useLayoutEffect(() => {
        if (!ref.current) return;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const cr = entries[0].contentRect;
                setSize({ width: cr.width, height: cr.height });
            }
        });
        ro.observe(ref.current);
        return () => ro.disconnect();
    }, []);
    return [ref, size];
}

// One donut (column width fixed by grid; radius varies by share)
// We compute a pixel radius so donuts are never “tiny”
function Donut({
    title,
    positive = 0,
    negative = 0,
    neutral = 0,
    share = 0,                 // 0..1 of grand total
    sizeExponent = 0.6,        // mapping curve (sqrt-ish). 1 = linear, >1 emphasizes big shares
    minRadiusPx = 48,          // minimum visible radius
    thicknessRatio = 0.30,     // ring thickness as fraction of radius
    minThicknessPx = 8,        // ensure thin donuts still readable
    strokeWidth = 1,
    labelHeight = 24,

    // Smooth animation controls
    animationBegin = 120,
    animationDuration = 900,
    animationEasing = 'ease-in-out',
    labelFadeMs = 250,
}) {
    const total = Math.max(0, positive + negative + neutral);
    const data = useMemo(
        () => [
            { name: 'Positive', value: Math.max(0, positive), color: COLORS.Positive, _title: title },
            { name: 'Negative', value: Math.max(0, negative), color: COLORS.Negative, _title: title },
            { name: 'Neutral', value: Math.max(0, neutral), color: COLORS.Neutral, _title: title },
        ],
        [positive, negative, neutral, title]
    );

    // Measure the square box so we can compute a pixel radius that fits
    const [boxRef, box] = useElementSize();
    const base = Math.max(0, Math.min(box.width || 0, box.height || 0)); // side length
    const safeMaxRadius = Math.max(10, Math.floor(base / 2) - 6); // keep small margins

    // If not measured yet, assume a reasonable container (keeps initial render decent)
    const maxRadiusPx = safeMaxRadius || 90;

    // Map share -> radius with a power curve for perceptual fairness
    const curved = Math.pow(Math.max(0, Math.min(1, share)), sizeExponent);
    const minR = Math.min(minRadiusPx, Math.max(0, maxRadiusPx - 2)); // clamp
    const radius = Math.max(minR, Math.round(minR + curved * (maxRadiusPx - minR)));

    // Keep ring thickness readable
    const thickness = Math.max(minThicknessPx, Math.round(radius * thicknessRatio));
    const innerRadius = Math.max(0, radius - thickness);

    const centerText = `${Math.round((share || 0) * 100)}%`;

    // Show center label AFTER the pie animation finishes
    const [showCenter, setShowCenter] = useState(false);
    useEffect(() => {
        setShowCenter(false);
        const delay = animationBegin + animationDuration;
        const t = setTimeout(() => setShowCenter(true), delay);
        return () => clearTimeout(t);
    }, [animationBegin, animationDuration, radius, share, positive, neutral, negative]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Square chart box to center the donut */}
            <div ref={boxRef} style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
                <ResponsiveContainer width="100%" height="100%" debounce={60}>
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            startAngle={90}
                            endAngle={-270}
                            cx="50%"
                            cy="50%"
                            innerRadius={innerRadius}
                            outerRadius={radius}
                            paddingAngle={1}
                            stroke="#fff"
                            strokeWidth={strokeWidth}
                            cornerRadius={5}
                            isAnimationActive={true}
                            animationBegin={animationBegin}
                            animationDuration={animationDuration}
                            animationEasing={animationEasing}
                        >
                            {data.map((seg, i) => (
                                <Cell key={i} fill={seg.color} />
                            ))}
                        </Pie>

                        {/* Modern custom tooltip */}
                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={false}
                            offset={12}
                            wrapperStyle={{
                                outline: 'none', zIndex: 1000,
                                position: 'absolute',
                            }}
                            allowEscapeViewBox={{ x: true, y: true }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center label (appears after pie animation, with smooth fade/scale) */}
                <div
                    style={{
                        pointerEvents: 'none',
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: `opacity ${labelFadeMs}ms ease-out, transform ${labelFadeMs + 50}ms ease-out`,
                        opacity: showCenter ? 1 : 0,
                        transform: showCenter ? 'scale(1)' : 'scale(0.96)',
                        willChange: 'opacity, transform',
                    }}
                >
                    <div style={{ fontSize: 'clamp(16px, 1.6vw, 22px)', fontWeight: 500, color: '#111827' }}>
                        {centerText}
                    </div>
                </div>
            </div>

            {/* Title */}
            <div
                style={{
                    marginTop: 8,
                    minHeight: labelHeight,
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: '14px',
                    whiteSpace: 'normal',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.2,
                    padding: '0 6px',
                }}
                title={title}
            >
                {toTitleCase(title)}
            </div>
        </div>
    );
}

// ComplaintDetection computes share and passes it to Donut.
// Donut sizes are clearly different and always centered.
export default function ComplaintDetection({
    data = {},
    items,
    limit = 5,                  // hard max 5
    gap = 20,
    labelHeight = 24,
    minRadiusPx = 48,           // bump up if donuts still feel small
    thicknessRatio = 0.30,
    minThicknessPx = 8,
    sizeExponent = 0.6,         // try 1 for linear, 0.5 for sqrt, 0.7 to favor big shares more
    // animation tuning (applies to each donut)
    animationBegin = 120,
    animationDuration = 900,
    animationEasing = 'ease-in-out',
    labelFadeMs = 250,
}) {
    const MAX = 5;
    const effectiveLimit = Math.min(Number(limit ?? MAX), MAX);

    // Normalize -> [{ title, positive, neutral, negative }]
    const rows = useMemo(() => {
        if (Array.isArray(items) && items.length) {
            return items.slice(0, effectiveLimit);
        }
        const obj = data || {};
        const arr = Object.entries(obj).map(([title, v]) => ({
            title: toTitleCase(title),
            positive: Number(v?.positive ?? v?.Positive ?? 0),
            neutral: Number(v?.neutral ?? v?.Neutral ?? 0),
            negative: Number(v?.negative ?? v?.Negative ?? 0),
        }));
        arr.sort(
            (a, b) =>
                (b.positive + b.neutral + b.negative) -
                (a.positive + a.neutral + a.negative)
        );
        return arr.slice(0, effectiveLimit);
    }, [data, items, effectiveLimit]);

    if (!rows.length) return null;

    // Totals and grand total
    const totals = rows.map(d => (d.positive || 0) + (d.neutral || 0) + (d.negative || 0));
    const grandTotal = totals.reduce((s, n) => s + n, 0);

    // Shares 0..1 (equal if grandTotal = 0)
    const shares = grandTotal > 0 ? totals.map(t => t / grandTotal) : rows.map(() => 1 / rows.length);

    return (
        <div style={{ width: '100%', boxSizing: 'border-box' }}>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))`,
                    alignItems: 'stretch',
                    gap,
                }}
            >
                {rows.map((d, idx) => (
                    <Donut
                        key={`${d.title}-${idx}`}
                        title={d.title}
                        positive={d.positive}
                        negative={d.negative}
                        neutral={d.neutral}
                        share={shares[idx]}
                        sizeExponent={sizeExponent}
                        minRadiusPx={minRadiusPx}
                        thicknessRatio={thicknessRatio}
                        minThicknessPx={minThicknessPx}
                        labelHeight={labelHeight}
                        animationBegin={animationBegin}
                        animationDuration={animationDuration}
                        animationEasing={animationEasing}
                        labelFadeMs={labelFadeMs}
                    />
                ))}
            </div>
        </div>
    );
}