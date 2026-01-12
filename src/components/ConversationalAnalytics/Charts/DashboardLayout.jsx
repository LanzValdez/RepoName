export default function DashboardLayout({ left, centerTop, centerBottom, right, bottom }) {
    const hasRight = Boolean(right);

    return (
        <div className="grid gap-4 py-4 px-0">
            {/* Top grid: 3 cols (or 2 if no right), 2 rows on md+: row1 auto, row2 fills rest */}
            <div
                className={
                    `
                    grid gap-4 md:gap-4
                    items-start md:items-stretch
                    grid-cols-1
                    md:[grid-template-rows:auto_1fr]
                    ` +
                    (hasRight
                        ? `
                    md:[grid-template-columns:minmax(260px,35%)_minmax(0,45%)_minmax(0,20%)]
                    lg:[grid-template-columns:minmax(280px,35%)_minmax(0,45%)_minmax(0,20%)]
                    2xl:[grid-template-columns:minmax(320px,35%)_minmax(0,45%)_minmax(0,20%)]
                    `
                        : `
                    md:[grid-template-columns:minmax(260px,35%)_minmax(0,65%)]
                    lg:[grid-template-columns:minmax(280px,35%)_minmax(0,65%)]
                    2xl:[grid-template-columns:minmax(320px,35%)_minmax(0,65%)]
                    `)
                }
            >
                {/* Left spans both rows */}
                <aside className="min-w-0 order-1 md:col-start-1 md:row-start-1 md:row-span-2">
                    <div className="h-auto md:h-full md:[&>*]:h-full md:[&>*]:flex md:[&>*]:flex-col">
                        {left}
                    </div>
                </aside>

                {/* Center top: row 1, col 2 */}
                <section className="min-w-0 order-2 md:col-start-2 md:row-start-1">
                    <div className="md:h-full md:[&>*]:h-full md:[&>*]:flex md:[&>*]:flex-col">
                        {centerTop}
                    </div>
                </section>

                {/* Right: row 1, col 3 (if present) */}
                {hasRight && (
                    <aside className="min-w-0 order-3 md:col-start-3 md:row-start-1">
                        <div className="md:h-full md:[&>*]:h-full md:[&>*]:flex md:[&>*]:flex-col">
                            {right}
                        </div>
                    </aside>
                )}

                {/* Center bottom: row 2, span across center (+ right if present) */}
                <section
                    className={`min-w-0 order-4 md:row-start-2 md:col-start-2 ${
                        hasRight ? 'md:col-span-2' : 'md:col-span-1'
                    }`}
                >
                    <div className="min-h-0 md:h-full md:[&>*]:h-full md:[&>*]:flex md:[&>*]:flex-col">
                        {centerBottom}
                    </div>
                </section>
            </div>

            {bottom ? <section className="min-w-0">{bottom}</section> : null}
        </div>
    );
}