import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import './DateRangePicker.css';

const GAP = 8;

function toStartOfDay(input) {
    if (!input) return null;
    const d = new Date(input);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a, b) {
    if (!a || !b) return false;
    return toStartOfDay(a).getTime() === toStartOfDay(b).getTime();
}

function addDays(date, days) {
    const d = toStartOfDay(date);
    d.setDate(d.getDate() + days);
    return d;
}

function startOfMonth(d) {
    const nd = new Date(d.getFullYear(), d.getMonth(), 1);
    return toStartOfDay(nd);
}

function endOfMonth(d) {
    const nd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return toStartOfDay(nd);
}

function rotateWeekdays(days, firstDay) {
    const arr = days.slice();
    return arr.slice(firstDay).concat(arr.slice(0, firstDay));
}

// ISO week number for better consistency
function getISOWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

const DateRangePicker = ({
    startDate = null,
    endDate = null,
    onApply = () => { },
    onCancel = () => { },
    locale = {
        format: 'MMM DD, YYYY',
        separator: '  →  ',
        applyLabel: 'Apply',
        cancelLabel: 'Close',
        customRangeLabel: 'Custom Range',
        daysOfWeek: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
        monthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        firstDay: 0
    },
    ranges = {
        Today: [new Date(), new Date()],
        Yesterday: [addDays(new Date(), -1), addDays(new Date(), -1)],
        'Last 7 Days': [addDays(new Date(), -6), new Date()],
        'Last 30 Days': [addDays(new Date(), -29), new Date()],
        'This Month': [startOfMonth(new Date()), new Date()],
        'Last Month': [
            startOfMonth(addDays(new Date(), -new Date().getDate())), // first day of last month
            endOfMonth(addDays(new Date(), -new Date().getDate())) // last day of last month
        ]
    },
    showDropdowns = true,
    showWeekNumbers = false,
    showCustomRangeLabel = true,
    autoApply = false,
    singleDatePicker = false,
    opens = 'right',
    drops = 'down',
    buttonClasses = 'btn btn-sm',
    applyButtonClasses = 'btn-primary',
    cancelButtonClasses = 'btn-secondary',
    className = '',
    placeholder = 'Select date range...'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tempStartDate, setTempStartDate] = useState(() => toStartOfDay(startDate));
    const [tempEndDate, setTempEndDate] = useState(() => toStartOfDay(endDate));
    const [leftCalendarDate, setLeftCalendarDate] = useState(() => startOfMonth(new Date()));
    const [rightCalendarDate, setRightCalendarDate] = useState(() =>
        startOfMonth(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1))
    );
    const [selectedRange, setSelectedRange] = useState('');
    const [hoveredDate, setHoveredDate] = useState(null);
    const [activeField, setActiveField] = useState('start');

    const containerRef = useRef(null);
    const inputRef = useRef(null);

    const popoverRef = useRef(null);

    const [autoOpens, setAutoOpens] = useState(opens === 'auto' ? 'right' : opens);
    const [autoDrops, setAutoDrops] = useState(drops === 'auto' ? 'down' : drops);
    const [popoverStyle, setPopoverStyle] = useState({
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 10000,
        visibility: 'hidden',
    });

    // Sanitize preset ranges to start-of-day and correct ordering
    const computedRanges = useMemo(() => {
        const out = {};
        Object.entries(ranges || {}).forEach(([name, arr]) => {
            if (!Array.isArray(arr) || arr.length < 2) return;
            let s = toStartOfDay(arr[0]);
            let e = toStartOfDay(arr[1]);
            if (s && e && s.getTime() > e.getTime()) {
                const tmp = s;
                s = e;
                e = tmp;
            }
            if (s && e) out[name] = [s, e];
        });
        return out;
    }, [ranges]);

    // Format date per locale
    const formatDate = (date) => {
        if (!date) return '';
        const d = toStartOfDay(date);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();
        const monthShort = locale.monthNames[d.getMonth()];

        return locale.format
            .replace('MMM', monthShort)
            .replace('MM', month)
            .replace('DD', day)
            .replace('YYYY', year);
    };

    // Input display text
    const getDisplayValue = () => {
        if (!tempStartDate) return '';
        if (singleDatePicker) return formatDate(tempStartDate);
        if (!tempEndDate) return formatDate(tempStartDate);
        return `${formatDate(tempStartDate)}${locale.separator}${formatDate(tempEndDate)}`;
    };

    // Calendar days (6 weeks grid)
    const generateCalendarDays = (date) => {
        const base = startOfMonth(date);
        const start = addDays(base, -((base.getDay() - locale.firstDay + 7) % 7));
        const days = [];
        const current = new Date(start);
        for (let i = 0; i < 42; i += 1) {
            days.push(toStartOfDay(current));
            current.setDate(current.getDate() + 1);
        }
        return days;
    };

    const isInRange = (date) => {
        if (!tempStartDate || !tempEndDate) return false;
        const d = toStartOfDay(date).getTime();
        const s = toStartOfDay(tempStartDate).getTime();
        const e = toStartOfDay(tempEndDate).getTime();
        return d >= s && d <= e;
    };

    const isStartDate = (date) => isSameDay(date, tempStartDate);
    const isEndDate = (date) => isSameDay(date, tempEndDate);

    const isInHoverRange = (date) => {
        if (!tempStartDate || tempEndDate || !hoveredDate) return false;
        const d = toStartOfDay(date).getTime();
        const s = toStartOfDay(tempStartDate).getTime();
        const h = toStartOfDay(hoveredDate).getTime();
        const start = Math.min(s, h);
        const end = Math.max(s, h);
        return d >= start && d <= end;
    };

    // Handle date selection
    const handleDateClick = (date) => {
        const d = toStartOfDay(date);

        if (singleDatePicker) {
            setTempStartDate(d);
            setTempEndDate(d);
            setSelectedRange('');
            if (autoApply) {
                onApply(d, d);
                setIsOpen(false);
            }
            return;
        }

        if (activeField === 'start') {
            setTempStartDate(d);
            if (tempEndDate && d.getTime() > toStartOfDay(tempEndDate).getTime()) {
                setTempEndDate(null);
            }
            setActiveField('end');
        } else {
            // picking end
            if (tempStartDate && d.getTime() < toStartOfDay(tempStartDate).getTime()) {
                // If end < start, treat as new start and clear end
                setTempStartDate(d);
                setTempEndDate(null);
                setActiveField('end');
            } else {
                setTempEndDate(d);
                setActiveField('start');
                if (autoApply) {
                    onApply(toStartOfDay(tempStartDate), d);
                    setIsOpen(false);
                }
            }
        }

        setSelectedRange('');
    };

    const handleRangeClick = (rangeName) => {
        if (rangeName === locale.customRangeLabel) {
            setSelectedRange(rangeName);
            return;
        }
        const range = computedRanges[rangeName];
        if (range) {
            const [s, e] = range;
            setTempStartDate(s);
            setTempEndDate(e);
            setSelectedRange(rangeName);
            setActiveField('start');

            // Adjust calendars to selected range months
            const left = startOfMonth(s);
            const rightCandidate = startOfMonth(e);
            setLeftCalendarDate(left);
            setRightCalendarDate(
                rightCandidate.getTime() <= left.getTime()
                    ? startOfMonth(new Date(left.getFullYear(), left.getMonth() + 1, 1))
                    : rightCandidate
            );

            if (autoApply) {
                onApply(s, e);
                setIsOpen(false);
            }
        }
    };

    const handleApply = () => {
        if (singleDatePicker && tempStartDate) {
            const d = toStartOfDay(tempStartDate);
            onApply(d, d);
            setIsOpen(false);
            return;
        }
        onApply(toStartOfDay(tempStartDate), toStartOfDay(tempEndDate));
        setIsOpen(false);
    };

    const handleCancel = () => {
        setTempStartDate(toStartOfDay(startDate));
        setTempEndDate(toStartOfDay(endDate));
        onCancel();
        setIsOpen(false);
    };

    const navigateMonth = (direction, calendar) => {
        if (calendar === 'left') {
            const newDate = startOfMonth(leftCalendarDate);
            newDate.setMonth(newDate.getMonth() + direction);
            setLeftCalendarDate(startOfMonth(newDate));
            // Keep right at least one month ahead
            const right = startOfMonth(rightCalendarDate);
            if (right.getTime() <= newDate.getTime()) {
                const r = startOfMonth(new Date(newDate.getFullYear(), newDate.getMonth() + 1, 1));
                setRightCalendarDate(r);
            }
        } else {
            const newDate = startOfMonth(rightCalendarDate);
            newDate.setMonth(newDate.getMonth() + direction);
            setRightCalendarDate(startOfMonth(newDate));
            // Keep left at most one month behind if overlapping
            const left = startOfMonth(leftCalendarDate);
            if (newDate.getTime() <= left.getTime()) {
                const l = startOfMonth(new Date(newDate.getFullYear(), newDate.getMonth() - 1, 1));
                setLeftCalendarDate(l);
            }
        }
    };

    const handleMonthYearChange = (month, year, calendar) => {
        const newDate = startOfMonth(new Date(year, month, 1));
        if (calendar === 'left') {
            setLeftCalendarDate(newDate);
            // Ensure right is ahead
            if (rightCalendarDate.getTime() <= newDate.getTime()) {
                setRightCalendarDate(startOfMonth(new Date(year, month + 1, 1)));
            }
        } else {
            setRightCalendarDate(newDate);
            // Ensure left is behind
            if (newDate.getTime() <= leftCalendarDate.getTime()) {
                setLeftCalendarDate(startOfMonth(new Date(year, month - 1, 1)));
            }
        }
    };

    // After open (ensure DOM is mounted)
    useLayoutEffect(() => {
        if (!isOpen) return;
        const id1 = requestAnimationFrame(() => {
            recomputePosition();
            const id2 = requestAnimationFrame(recomputePosition);
            return () => cancelAnimationFrame(id2);
        });
        return () => cancelAnimationFrame(id1);
    }, [isOpen]);

    // Keep aligned on resize/scroll
    useEffect(() => {
        if (!isOpen) return;
        const handler = () => recomputePosition();
        window.addEventListener('resize', handler);
        window.addEventListener('scroll', handler, true);
        return () => {
            window.removeEventListener('resize', handler);
            window.removeEventListener('scroll', handler, true);
        };
    }, [isOpen]);

    // Optional: if calendar content changes size/months
    useEffect(() => {
        if (isOpen) recomputePosition();
    }, [leftCalendarDate, rightCalendarDate, showDropdowns, showWeekNumbers, selectedRange, isOpen]);

    const recomputePosition = () => {
        if (!isOpen || !inputRef.current || !popoverRef.current) return;

        const triggerRect = inputRef.current.getBoundingClientRect();
        const popRect = popoverRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const spaceBelow = vh - triggerRect.bottom;
        const spaceAbove = triggerRect.top;
        const spaceRight = vw - triggerRect.left;
        const spaceLeft = triggerRect.right;

        // Vertical (drops)
        let newDrops = drops === 'auto' ? 'down' : drops;
        if (drops === 'auto') {
            if (spaceBelow >= popRect.height + GAP) newDrops = 'down';
            else if (spaceAbove >= popRect.height + GAP) newDrops = 'up';
            else newDrops = spaceBelow >= spaceAbove ? 'down' : 'up';
        }

        // Horizontal (opens)
        let newOpens = opens === 'auto' ? 'right' : opens;
        if (opens === 'auto') {
            if (spaceRight >= popRect.width) newOpens = 'right';
            else if (spaceLeft >= popRect.width) newOpens = 'left';
            else newOpens = 'right';
        }

        // Coordinates
        let top =
            newDrops === 'down'
                ? Math.min(triggerRect.bottom + GAP, vh - popRect.height - GAP)
                : Math.max(triggerRect.top - popRect.height - GAP, GAP);

        let left =
            newOpens === 'right'
                ? triggerRect.left
                : triggerRect.right - popRect.width;

        left = Math.min(Math.max(GAP, left), vw - popRect.width - GAP);

        setAutoDrops(newDrops);
        setAutoOpens(newOpens);
        setPopoverStyle({
            position: 'fixed',
            top: Math.round(top),
            left: Math.round(left),
            zIndex: 10000,
            visibility: 'visible',
        });
    };

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event) => {
            const inInput = inputRef.current?.contains(event.target);
            const inPopover = popoverRef.current?.contains(event.target);
            if (!inInput && !inPopover) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Sync with incoming props
    useEffect(() => {
        setTempStartDate(toStartOfDay(startDate));
        setTempEndDate(toStartOfDay(endDate));
        if (!startDate && !endDate) setSelectedRange('');
    }, [startDate, endDate]);

    // Auto-apply only when requested
    useEffect(() => {
        if (!autoApply) return;
        if (singleDatePicker) {
            if (tempStartDate) {
                const d = toStartOfDay(tempStartDate);
                onApply(d, d);
                setIsOpen(false);
            }
            return;
        }
        if (tempStartDate && tempEndDate) {
            onApply(toStartOfDay(tempStartDate), toStartOfDay(tempEndDate));
            setIsOpen(false);
        }
    }, [tempStartDate, tempEndDate, autoApply, singleDatePicker, onApply]);

    const Calendar = ({ date, isLeft }) => {
        const days = generateCalendarDays(date);
        const monthYear = `${locale.monthNames[date.getMonth()]} ${date.getFullYear()}`;
        const daysOfWeek = rotateWeekdays(locale.daysOfWeek, locale.firstDay);

        return (
            <div className={`drp-calendar ${isLeft ? 'left' : 'right'}`}>
                <div className="calendar-header">
                    <button
                        type="button"
                        className="prev"
                        onClick={() => navigateMonth(-1, isLeft ? 'left' : 'right')}
                        aria-label="Previous month"
                    >
                        ‹
                    </button>

                    {showDropdowns ? (
                        <div className="month-year-selects">
                            <select
                                value={date.getMonth()}
                                onChange={(e) =>
                                    handleMonthYearChange(parseInt(e.target.value, 10), date.getFullYear(), isLeft ? 'left' : 'right')
                                }
                            >
                                {locale.monthNames.map((month, index) => (
                                    <option
                                        className="!py-2 !px-4 !text-left !bg-transparent !transition-colors !duration-150 !border-none !cursor-pointer"
                                        key={month}
                                        value={index}
                                    >
                                        {month}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={date.getFullYear()}
                                onChange={(e) =>
                                    handleMonthYearChange(date.getMonth(), parseInt(e.target.value, 10), isLeft ? 'left' : 'right')
                                }
                            >
                                {Array.from({ length: 100 }, (_, i) => date.getFullYear() - 50 + i).map((yr) => (
                                    <option
                                        className="!py-2 !px-4 !text-left !bg-transparent !transition-colors !duration-150 !border-none !cursor-pointer"
                                        key={yr}
                                        value={yr}
                                    >
                                        {yr}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <span className="month-year">{monthYear}</span>
                    )}

                    <button
                        type="button"
                        className="next"
                        onClick={() => navigateMonth(1, isLeft ? 'left' : 'right')}
                        aria-label="Next month"
                    >
                        ›
                    </button>
                </div>

                <table className="calendar-table">
                    <thead>
                        <tr>
                            {showWeekNumbers && <th className="week-header">W</th>}
                            {daysOfWeek.map((day, index) => (
                                <th key={index}>{day}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 6 }, (_, weekIndex) => (
                            <tr key={weekIndex}>
                                {showWeekNumbers && (
                                    <td className="week-number">{getISOWeekNumber(days[weekIndex * 7])}</td>
                                )}
                                {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => {
                                    const isCurrentMonth = day.getMonth() === date.getMonth();
                                    const isToday = isSameDay(day, new Date());
                                    const isStart = isStartDate(day);
                                    const isEnd = isEndDate(day);
                                    const inRange = isInRange(day);
                                    const inHoverRange = isInHoverRange(day);

                                    return (
                                        <td
                                            key={dayIndex}
                                            className={`calendar-day ${isCurrentMonth ? 'available' : 'off'} ${isToday ? 'today' : ''
                                                } ${isStart ? 'start-date active' : ''} ${isEnd ? 'end-date active' : ''
                                                } ${inRange ? 'in-range' : ''} ${inHoverRange ? 'in-hover-range' : ''}`}
                                            onClick={() => isCurrentMonth && handleDateClick(day)}
                                            onMouseEnter={() => setHoveredDate(day)}
                                            onMouseLeave={() => setHoveredDate(null)}
                                        >
                                            {day.getDate()}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className={`daterangepicker-container ${className}`} ref={containerRef}>
            <input
                ref={inputRef}
                type="text"
                className="form-control"
                placeholder={placeholder}
                value={getDisplayValue()}
                onClick={() => setIsOpen(!isOpen)}
                readOnly
            />

            {/* {isOpen && (
                <div className={`daterangepicker ${opens} ${drops}`}>
                    <div
                        className="drp-active-fields"
                        style={{ display: 'flex', gap: '8px', marginBottom: '8px', justifyContent: 'space-evenly' }}
                    >
                        <button
                            className={activeField === 'start' ? 'active' : ''}
                            onClick={() => setActiveField('start')}
                            type="button"
                        >
                            Start Date: {tempStartDate ? formatDate(tempStartDate) : '—'}
                        </button>
                        <button
                            className={activeField === 'end' ? 'active' : ''}
                            onClick={() => setActiveField('end')}
                            type="button"
                        >
                            End Date: {tempEndDate ? formatDate(tempEndDate) : '—'}
                        </button>
                    </div>

                    <div className="drp-calendars">
                        <Calendar date={leftCalendarDate} isLeft={true} />
                        {!singleDatePicker && <Calendar date={rightCalendarDate} isLeft={false} />}
                    </div>

                    <div className="preset-ranges">
                        {Object.keys(computedRanges).map((rangeName) => (
                            <button
                                key={rangeName}
                                className={`preset-range-btn${selectedRange === rangeName ? ' active' : ''}`}
                                onClick={() => handleRangeClick(rangeName)}
                                type="button"
                            >
                                {rangeName}
                            </button>
                        ))}
                        {showCustomRangeLabel && (
                            <button
                                className={`preset-range-btn${selectedRange === locale.customRangeLabel ? ' active' : ''
                                    }`}
                                onClick={() => handleRangeClick(locale.customRangeLabel)}
                                type="button"
                            >
                                {locale.customRangeLabel}
                            </button>
                        )}
                    </div>

                    {!autoApply && (
                        <div className="drp-buttons">
                            <button
                                type="button"
                                className={`${buttonClasses} ${cancelButtonClasses}`}
                                onClick={handleCancel}
                            >
                                {locale.cancelLabel}
                            </button>
                            <button
                                type="button"
                                className={`${buttonClasses} ${applyButtonClasses}`}
                                onClick={handleApply}
                                disabled={
                                    !tempStartDate || (!singleDatePicker && !tempEndDate)
                                }
                            >
                                {locale.applyLabel}
                            </button>
                        </div>
                    )}
                </div>
            )} */}


            {isOpen &&
                createPortal(
                    <div
                        ref={popoverRef}
                        className={`daterangepicker ${autoOpens} ${autoDrops}`}
                        style={popoverStyle}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div
                            className="drp-active-fields"
                            style={{ display: 'flex', gap: '8px', marginBottom: '8px', justifyContent: 'space-evenly' }}
                        >
                            <button
                                className={activeField === 'start' ? 'active' : ''}
                                onClick={() => setActiveField('start')}
                                type="button"
                            >
                                Start Date: {tempStartDate ? formatDate(tempStartDate) : '—'}
                            </button>
                            <button
                                className={activeField === 'end' ? 'active' : ''}
                                onClick={() => setActiveField('end')}
                                type="button"
                            >
                                End Date: {tempEndDate ? formatDate(tempEndDate) : '—'}
                            </button>
                        </div>

                        <div className="drp-calendars">
                            <Calendar date={leftCalendarDate} isLeft={true} />
                            {!singleDatePicker && <Calendar date={rightCalendarDate} isLeft={false} />}
                        </div>

                        <div className="preset-ranges">
                            {Object.keys(computedRanges).map((rangeName) => (
                                <button
                                    key={rangeName}
                                    className={`preset-range-btn${selectedRange === rangeName ? ' active' : ''}`}
                                    onClick={() => handleRangeClick(rangeName)}
                                    type="button"
                                >
                                    {rangeName}
                                </button>
                            ))}
                            {showCustomRangeLabel && (
                                <button
                                    className={`preset-range-btn${selectedRange === locale.customRangeLabel ? ' active' : ''}`}
                                    onClick={() => handleRangeClick(locale.customRangeLabel)}
                                    type="button"
                                >
                                    {locale.customRangeLabel}
                                </button>
                            )}
                        </div>

                        {!autoApply && (
                            <div className="drp-buttons">
                                <button
                                    type="button"
                                    className={`${buttonClasses} ${cancelButtonClasses}`}
                                    onClick={handleCancel}
                                >
                                    {locale.cancelLabel}
                                </button>
                                <button
                                    type="button"
                                    className={`${buttonClasses} ${applyButtonClasses}`}
                                    onClick={handleApply}
                                    disabled={!tempStartDate || (!singleDatePicker && !tempEndDate)}
                                >
                                    {locale.applyLabel}
                                </button>
                            </div>
                        )}
                    </div>,
                    document.body
                )
            }
        </div>
    );
};

export default DateRangePicker;