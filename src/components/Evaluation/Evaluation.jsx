import React, { useState, useEffect, useMemo } from 'react'
import { InputSelect, Button, Tabs, Table, Input, Chip, Loader, Toast, NoContent } from '@supportninja/ui-components'
import { RadialBarChart, RadialBar, BarChart, Bar, XAxis, Cell, YAxis, PolarAngleAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer } from 'recharts';
import auditIcon from '../../assets/icons/audit.svg';
import qualityIcon from '../../assets/icons/quality.svg';
import neutralIcon from '../../assets/icons/neutral.svg';
import positiveIcon from '../../assets/icons/positive.svg';
import negativeIcon from '../../assets/icons/negative.svg';
import eyeLogo from "../../assets/icons/eye.svg";
import DateRangePicker from '../common/DateRangePicker';
import { format, parseISO } from 'date-fns';
import api from '../../api/axios';
import "../Evaluation/evaluation.css"

const Evaluation = () => {

    const [accountName, setAccountName] = useState(null);
    const [agentName, setAgentName] = useState(null);
    const [agents, setAgents] = useState([]);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [metricsData, setMetricsData] = useState(null);

    const [toast, setToast] = useState(null);
    const showToast = (msg, opts = {}) => setToast({ message: msg, ...opts });

    const formatTimestamp = (timestamp) => {
        return format(parseISO(timestamp), "dd MMMM yyyy, hh:mm a");
    };
    useEffect(() => {
        (async () => {
            const savedAccount = localStorage.getItem('selectedAccount');
            const savedStartDate = localStorage.getItem('selectedStartDate');
            const savedEndDate = localStorage.getItem('selectedEndDate');

            await fetchAccounts();
            if (savedAccount) {
                await fetchAgents(savedAccount);
            }
            if (savedStartDate) setStartDate(savedStartDate);
            if (savedEndDate) setEndDate(savedEndDate);
        })();
    }, [])

    useEffect(() => {
        if (
            accountName &&
            agentName &&
            startDate &&
            endDate &&
            accounts.length > 0 &&
            agents.length > 0
        ) {
            handleFetchMetrics();
        }
    }, [accountName, agentName, startDate, endDate, accounts, agents]);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            // Refactored: Use GET /qa/accounts instead of POST /qa/query
            const response = await api.get("/qa/accounts");
            const data = response.data?.account_details || [];
            setAccounts(data);
            const savedAccount = localStorage.getItem("selectedAccount");
            if (savedAccount) setAccountName(savedAccount);
        } catch (error) {
            console.error('Error fetching accounts:', error);
            showToast("Error in fetching the accounts data", {
                type: "error",
                duration: 4000,
                position: "bottom-right",
                onClose: () => setToast(null),
            })
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (accountName) localStorage.setItem('selectedAccount', accountName);
    }, [accountName]);

    useEffect(() => {
        if (agentName) localStorage.setItem('selectedAgent', JSON.stringify(agentName));
    }, [agentName]);

    useEffect(() => {
        if (startDate) localStorage.setItem('selectedStartDate', startDate);
        if (endDate) localStorage.setItem('selectedEndDate', endDate);
    }, [startDate, endDate]);

    const fetchAgents = async (accountId) => {
        setLoading(true);
        try {
            const response = await api.get(`/qa/agents?accountId=${accountId}`);
            const data = response.data?.agent_details || [];
            setAgents(data);
            const savedAgent = localStorage.getItem("selectedAgent");
            if (savedAgent) {
                const parsedAgent = JSON.parse(savedAgent);
                if (Array.isArray(parsedAgent)) {
                    setAgentName(parsedAgent);
                }
            }
        } catch (error) {
            console.error('Error fetching agents:', error);
            showToast("Error in fetching the agents data", {
                type: "error",
                duration: 4000,
                position: "bottom-right",
                onClose: () => setToast(null),
            })
        } finally {
            setLoading(false);
        }
    }

    const handleAccountChange = (value) => {
        setAccountName(value);
        setAgentName(null);
        fetchAgents(value);
    }

    const handleFetchMetrics = async () => {
        setLoading(true);
        try {
            const response = await api.post('/qa/query', {
                eventType: "get_totals",
                userId: localStorage.getItem("userEmail"),
                account_id: accountName,
                position_ids: agentName,
                startDate: startDate ? format(new Date(startDate), 'yyyy-MM-dd') : '',
                endDate: endDate ? format(new Date(endDate), 'yyyy-MM-dd') : ''
            });
            setMetricsData(response?.data?.metrics || null);
        } catch (error) {
            console.error('Error fetching metrics:', error);
            showToast("Error in fetching the metrics data", {
                type: "error",
                duration: 4000,
                position: "bottom-right",
                onClose: () => setToast(null),
            })
        } finally {
            setLoading(false);
        }
    }

    const COLORS = ['#BF83FF', '#FF947A', '#6993FF'];

    const columns = [
        {
            header: "Ticket ID", accessor: "ticket_id", sortable: true, width: "350px",
            render: ({ row }) => (
                <span
                    onClick={() => {
                        row?.ticket_id ? navigate(`/quality-form`, { state: { prompt: row } }) : null;
                    }}
                    className={`relative cursor-pointer text-blue-700 font-medium inline-block group ${row?.ticket_id ? '' : 'pointer-events-none text-gray-500'
                        }`}
                >
                    {row?.ticket_id || '-'}
                    {row?.ticket_id && (
                        <span
                            className="absolute left-0 bottom-0 h-[1.5px] w-0 bg-blue-700 transition-all duration-300 group-hover:w-full"
                        />
                    )}
                </span>

            )
        },
        { header: "Agent Name", accessor: "assignee_name", width: "150px", sortable: true, },
        { header: "Created Date", accessor: "created_at", width: "200px", sortable: true, render: ({ row }) => formatTimestamp(row.created_at) },
        { header: "Closed Date", accessor: "updated_at", width: "200px", sortable: true, render: ({ row }) => formatTimestamp(row.updated_at) },

        { header: "QA Score", accessor: "qa_score", sortable: true, width: "150px", render: ({ row }) => row.qa_score || "N/A" },
        { header: "Manual QA Score", accessor: "manual_qa_score", sortable: true, width: "190px", render: ({ row }) => row.manual_qa_score || "N/A" },
        {
            header: "Sentiment", accessor: "sentiment", sortable: true, width: "130px", render: ({ row }) => (
                <Chip variant={row.sentiment === "positive" ? "success" : row.sentiment === "negative" ? "error" : "processing"}>
                    {row.sentiment}
                </Chip>
            ),
        },
        { header: "Issue", accessor: "issue", sortable: true, width: "130px" },
        { header: "Feedback", accessor: "feedback", width: "550px" },
        {
            header: "Actions",
            accessor: "actions",
            render: ({ row }) => (
                <img
                    src={eyeLogo}
                    alt="View details"
                    className="cursor-pointer w-6 h-6"
                    onClick={() => {
                        setOpenDrawer({ open: true, data: row });
                    }}
                />
            ),
        },
    ];



    const DigitalQABoards = () => {
        const stats = {
            total_audits: metricsData?.total_audits,
            average_qa_percentage: metricsData?.average_qa_percentage,
            total_neutral_interactions: metricsData?.total_neutral_interactions,
            total_positive_interactions: metricsData?.total_positive_interactions,
            total_negative_interactions: metricsData?.total_negative_interactions,
        };

        const cardConfig = [
            {
                icon: <img src={auditIcon} className="w-7 h-7 text-[#4A90E2]" alt="Audit Icon" />,
                valueKey: "total_audits",
                label: "Number of Audits",
                bg: "bg-[#6993FF33]",
            },
            {
                icon: <img src={qualityIcon} className="w-7 h-7 text-[#FF8C5B]" alt="Quality Icon" />,
                valueKey: "average_qa_percentage",
                label: "Quality Score",
                bg: "bg-[#FFF4DE]",
            },
            {
                icon: <img src={neutralIcon} className="w-7 h-7 text-[#B18AFF]" alt="Neutral Icon" />,
                valueKey: "total_neutral_interactions",
                label: "Neutral Interaction",
                bg: "bg-[#F3E8FF]",
            },
            {
                icon: <img src={positiveIcon} className="w-7 h-7 text-[#4ADE80]" alt="Positive Icon" />,
                valueKey: "total_positive_interactions",
                label: "Positive Interaction",
                bg: "bg-[#DCFCE7]",
            },
            {
                icon: <img src={negativeIcon} className="w-7 h-7 text-[#FF5B5B]" alt="Negative Icon" />,
                valueKey: "total_negative_interactions",
                label: "Negative Interaction",
                bg: "bg-[#FFE2E5]",
            },
        ];



        return (
            <div className='m-4'>
                <div>
                    <div className='font-bold text-[20px] leading-[32px] tracking-normal text-[#05004E]'>
                        Digital Quality Audit Boards
                    </div>
                    <div className='font-medium text-[16px] leading-[30px] tracking-normal text-[#737791]'>
                        Audit Summary
                    </div>
                </div>
                <div className="grid mx-2 mt-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 w-full">
                    {cardConfig.map((card, idx) => (
                        <div
                            key={idx}
                            className={`flex flex-col items-start p-8 rounded-2xl w-full ${card.bg}`}
                        >
                            <div className="mb-2">{card.icon}</div>
                            <div className="font-bold text-2xl text-[#151D48]">
                                {stats[card.valueKey] ?? "--"}
                            </div>
                            <div className="text-sm text-[#425166]">{card.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    const RecentEvaluation = () => {
        const [search, setSearch] = useState("");
        const visibleAccessors = columns.map(col => col.accessor);
        const filteredTickets = useMemo(() => {
            if (!search) return metricsData?.tickets || [];
            const lower = search.toLowerCase();
            return (metricsData?.tickets || []).filter(row =>
                visibleAccessors.some(
                    accessor => {
                        const val = row[accessor];
                        if (val === null || val === undefined) return false;
                        return String(val).toLowerCase().includes(lower);
                    }
                )
            );
        }, [search, metricsData]);

        return (
            <div className='m-4'>
                <div className='mt-6'>
                    <div className='font-bold text-[20px] leading-[32px] tracking-normal text-[#05004E]'>
                        Recent Evaluations
                    </div>
                    <div className='font-medium text-[16px] leading-[30px] tracking-normal text-[#737791]'>
                        Audit Summary
                    </div>
                </div>
                <div className="mb-4 flex justify-end min-w-[280px]">
                    <Input
                        label=""
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search..."
                        error={""}
                    />
                </div>
                <Table
                    columns={columns}
                    data={filteredTickets || []}
                    pagination={{ pageSize: 10 }}
                    className="!w-full [&_thead]:text-[14px]
                            [&_tbody]:w-full [&_tbody]:text-sm table-scroll"
                />
            </div>
        )
    }

    function toRadialBarData(obj) {
        return Object.entries(obj).map(([name, value], idx) => ({
            name,
            value,
            fill: COLORS[idx % COLORS.length],
        }));
    }

    function CriticalChart({ data, title }) {
        return (
            <div className='bg-white rounded-xl shadow p-4'>
                <h3 className="font-semibold mb-2">{title}</h3>
                <div className="flex items-center">
                    <div className='flex-1'>
                        <RadialBarChart
                            width={220}
                            height={220}
                            cx="50%"
                            cy="50%"
                            innerRadius={10}
                            outerRadius={100}
                            barSize={9}
                            data={toRadialBarData(data)}
                        >
                            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                            <RadialBar
                                minAngle={15}
                                background
                                clockWise
                                dataKey="value"
                            />
                        </RadialBarChart>
                    </div>
                    <div className='flex-1 flex items-start'>
                        <ul className="mt-2 space-y-1 text-sm">
                            {Object.entries(data).map(([key, value], idx) => (
                                <li key={key} className="flex flex-col items-center gap-2">
                                    <span><span className="inline-block w-3 h-3 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} > </span>
                                        <span className="capitalize text-[#83868E] mx-4">{key.replace(/_/g, ' ')}</span>
                                    </span>
                                    <span className="font-semibold">{Math.round(value)}%</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    const CriticalMetrics = () => {
        return (
            <div className='m-4'>
                <div className='my-6'>
                    <div className='font-bold text-[20px] leading-[32px] tracking-normal text-[#05004E]'>
                        Critical Metrics
                    </div>
                    <div className='font-medium text-[16px] leading-[30px] tracking-normal text-[#737791]'>
                        Audit Summary for Customer Critical, Business Critical and Non Critical
                    </div>
                </div>

                <div>
                    <div>
                        <div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <CriticalChart data={metricsData?.customer_critical} title="Customer Critical" />
                                <CriticalChart data={metricsData?.business_critical} title="Business Critical" />
                                <CriticalChart data={metricsData?.non_critical} title="Non Critical" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const BarChartGraph = () => {
        const COLORS = {
            "Business Critical": "#BF83FF",
            "Customer Critical": "#FF947A",
            "Non Critical": "#6993FF"
        };
        const combinedData = [
            ...Object.entries(metricsData?.business_critical).map(([key, value]) => ({
                name: key.replace(/_/g, ' '),
                value,
                category: "Business Critical"
            })),
            ...Object.entries(metricsData?.customer_critical).map(([key, value]) => ({
                name: key.replace(/_/g, ' '),
                value,
                category: "Customer Critical"
            })),
            ...Object.entries(metricsData?.non_critical).map(([key, value]) => ({
                name: key.replace(/_/g, ' '),
                value,
                category: "Non Critical"
            })),
        ];
        const agentData = metricsData?.agent_metrics || [];
        const barCount = agentData.length;

        let perBarHeight;
        if (barCount <= 5) {
            perBarHeight = 60;
        } else if (barCount <= 10) {
            perBarHeight = 45;
        } else if (barCount <= 20) {
            perBarHeight = 35;
        } else {
            perBarHeight = 25;
        }
        const minHeight = 200;

        const chart1Height = Math.max(minHeight, combinedData.length * perBarHeight);
        const chart2Height = Math.max(minHeight, agentData.length * perBarHeight);
        return (
            <div>

                <div className="bg-white rounded-xl p-6 shadow">
                    <h2 className="font-bold text-lg text-[#1A2347] mb-2">Digital Quality Audit Boards</h2>
                    <ResponsiveContainer width="100%" height={chart1Height}>
                        <BarChart
                            data={combinedData}
                            layout="vertical"
                            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis type="number" domain={[0, 100]}
                                tick={{ fontSize: 14, fill: '#A1A1AA' }} />
                            <YAxis
                                type="category"
                                dataKey="name"
                                width={250}
                                tick={({ x, y, payload }) => (
                                    <text
                                        x={x}
                                        y={y}
                                        dy={4}
                                        fontSize={14}
                                        fontWeight={300}
                                        fill="#252B41A3"
                                        textAnchor="end"
                                    >
                                        {String(payload.value).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </text>
                                )}
                            />
                            <Tooltip />
                            <Bar
                                dataKey="value"
                                barSize={20}
                                radius={[10, 10, 10, 10]}
                                fill="#8884d8"
                            >
                                <LabelList dataKey="value" position="right" fill="#1A2347" fontWeight={300} />
                                {
                                    combinedData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[entry.category]} />
                                    ))
                                }
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-xl p-6 shadow my-4">
                    <h2 className="font-bold text-lg text-[#1A2347] mb-2">Agent Performance</h2>
                    <ResponsiveContainer width="100%" height={chart2Height}>
                        <BarChart
                            data={metricsData?.agent_metrics}
                            layout="vertical"
                            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                        >
                            <CartesianGrid strokeDasharray="1 1" vertical={false} />
                            <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 14, fill: '#A1A1AA' }} />
                            <YAxis
                                type="category"
                                dataKey="agent_name"
                                width={250}
                                tick={({ x, y, payload }) => (
                                    <text
                                        x={x}
                                        y={y}
                                        dy={4}
                                        fontSize={14}
                                        fontWeight={300}
                                        fill="#252B41A3"
                                        textAnchor="end"
                                    >
                                        {String(payload.value).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </text>
                                )}
                            />
                            <Tooltip />
                            <Bar dataKey="average_qa_score" fill="#EE4B4A" barSize={20} radius={[10, 10, 10, 10]}>
                                <LabelList dataKey="average_qa_score" position="right" fill="#1A2347" fontWeight={300} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        )
    }

    const tabData = [
        {
            label: "Digital Quality Audit Boards",
            content: (
                <DigitalQABoards />
            ),
        },
        {
            label: "Bar Charts",
            content: (
                <BarChartGraph />
            ),
        },
        {
            label: "Critical Metrics",
            content: (
                <CriticalMetrics />
            ),
        },
        {
            label: "Recent Evaluation",
            content: (
                <RecentEvaluation />
            ),
        },
    ];

    const handleApply = () => {
        if (!accountName || !agentName || !startDate || !endDate) {
            showToast("Please fill all the required fields", {
                type: "error",
                duration: 9000,
                position: "bottom-right",
                onClose: () => setToast(null),
            })
            return;
        }
        handleFetchMetrics();
    }

    const handleClear = () => {
        setAccountName(null);
        setAgentName(null);
        setStartDate(null);
        setEndDate(null);
        localStorage.removeItem('selectedAccount');
        localStorage.removeItem('selectedAgent');
        localStorage.removeItem('selectedStartDate');
        localStorage.removeItem('selectedEndDate');
    }

    return (
        <div>
            {loading && <Loader />}
            {toast && <Toast {...toast} />}
            <div className='border border-[#E2E2E2] p-6'>
                <div className='font-semibold text-[#26203B] mb-2 text-xl leading-none tracking-normal'>
                    Account & Agent Details
                </div>
                <div className='font-medium text-[#313133] text-sm leading-none tracking-normal'>
                    Enter the details for Account name and Agents in order to see the details.
                </div>

                <div className='mt-6 flex gap-4'>
                    <div className='mt-[5px] flex gap-2 flex-col'>
                        <span className='font-medium text-[#111827] text-base leading-none tracking-normal'>Date Range <span className='text-[#ef4444]'>*</span></span>
                        <DateRangePicker
                            startDate={startDate}
                            endDate={endDate}
                            onApply={(start, end) => { setStartDate(start); setEndDate(end); }}
                            autoApply={true}
                        />
                    </div>
                    <div>
                        <InputSelect
                            title="Account Name"
                            required
                            options={accounts?.map(item => ({
                                label: item.account_name,
                                value: item.account_id
                            }))}
                            value={accountName}
                            onChange={handleAccountChange}
                            placeholder="Select Account Name"
                        />
                    </div>
                    <div>
                        <InputSelect
                            title="Agents"
                            required
                            options={agents?.map(item => ({
                                label: item.agent_name,
                                value: item.position_id
                            }))}
                            value={agentName}
                            showSelectAll={true}
                            onChange={setAgentName}
                            multi
                            placeholder="Select Agents"
                        />
                    </div>
                </div>

                <div className='mt-6 flex gap-3 justify-end'>
                    <Button onClick={handleClear} className="btn-secondary-active !px-5 !py-2">Clear</Button>
                    <Button onClick={handleApply} className="btn-default-active !px-5 !py-2">Apply</Button>
                </div>
            </div>

            <div className='my-8'>
                {metricsData ? <Tabs className='!max-w-full !p-0 [&_.tabs-header]:text-[16px]' tabs={tabData} /> : <NoContent className='!w-full' />}
            </div>
        </div>
    )
}

export default Evaluation