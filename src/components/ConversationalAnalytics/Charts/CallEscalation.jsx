// src/graphs/CallEscalationTrends.jsx
import React from 'react';
import { toTitleCase } from '../../common/strings';
import { NoContent } from '@supportninja/ui-components';
import { isEmptyObject, hasObjectData } from '../../common/strings';


export default function CallEscalationTrends({
    metricsData,                 // object or array of { name, value }
    title = 'Call Escalation Trends',
    headerLeft = 'Reason',
    headerRight = 'Count',
    barColorClass = 'bg-[#EE4B4A]',      // customize bar color if you want
    trackColorClass = 'bg-[#EEF2F7]',
    sortDesc = true,                     // sort by value desc
}) {
    const data = metricsData?.call_escalation_trends || [];
    const rows = React.useMemo(() => {
        const arr = Array.isArray(data)
            ? data.map(d => ({ name: d.name, value: Number(d.value) || 0 }))
            : Object.entries(data || {}).map(([name, value]) => ({
                name,
                value: Number(value) || 0,
            }));
        if (sortDesc) arr.sort((a, b) => b.value - a.value);
        return arr;
    }, [data, sortDesc]);

    const max = Math.max(1, ...rows.map(r => r.value));

    if (isEmptyObject(metricsData?.call_escalation_trends)) {
        return (
            <div className="rounded-3xl bg-white p-4 shadow-md ring-1 ring-black/5 md:p-5">
                <h3 className="mb-4 text-[16px] panel__title leading-6 text-[#0B1454]">{title}</h3>
                <NoContent className='!w-full !h-full flex justify-center items-center' />
            </div>
        )
    }

    return (
        <div className="rounded-3xl bg-white p-4 shadow-md ring-1 ring-black/5 md:p-5">
            <h3 className="mb-4 text-[16px] panel__title leading-6 text-[#0B1454]">{title}</h3>

            <div className="mb-4 grid grid-cols-[1fr_auto] items-center rounded-lg bg-gray-100 px-2 py-2 text-sm font-semibold text-gray-900">
                <div>{headerLeft}</div>
                <div className="text-right">{headerRight}</div>
            </div>

            <div className="space-y-6">
                {rows.map((r) => {
                    const widthPct = (r.value / max) * 100;
                    return (
                        <div key={r.name} className="grid grid-cols-[1fr_auto] items-center gap-4">
                            <div className="min-w-0 flex flex-col">
                                <div className="truncate text-[15px] font-light leading-tight text-[#637381]">
                                    {toTitleCase(r.name)}
                                </div>
                                <div
                                    className={`mt-2 h-[8px] w-full overflow-hidden rounded-full ${trackColorClass}`}
                                    aria-label={`${r.name}: ${r.value}`}
                                >
                                    <div
                                        className={`h-full rounded-full ${barColorClass}`}
                                        style={{ width: `${widthPct}%` }}
                                    />
                                </div>
                            </div>

                            <div className="w-24 shrink-0 text-right text-[15px] font-normal text-[#111827]">
                                {r.value}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}