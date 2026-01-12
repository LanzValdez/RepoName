import React, { useState, useEffect, useMemo } from 'react'
import { InputSelect, Button, Tabs, Table, Input, Chip, TextArea, Radio, Modal, Loader, Toast, NoContent, Accordion } from '@supportninja/ui-components'
import tickIcon from "../../assets/icons/green-tick.svg"
import crossIcon from "../../assets/icons/red-cross.svg"
import minusIcon from "../../assets/icons/minus.svg"
import copy from "../../assets/icons/copy.svg"
import tick from "../../assets/icons/tick.svg"
import DateRangePicker from '../common/DateRangePicker'
import api from '../../api/axios'
import { format } from 'date-fns'
import { toTitleCase } from '../common/strings'
import "./qualityForm.css"
import { useLocation, useSearchParams } from "react-router-dom";
import { sendEventToApi } from '../../utlis/analytics';

const GOOGLE_CLIENT_ID = '106603981486-qpkulg9imin5t1jl89ab7hjlhci5fani.apps.googleusercontent.com';
const QualityForm = () => {
    const [loading, setLoading] = useState(true);
    const [accountName, setAccountName] = useState(null);
    const [agents, setAgents] = useState([]);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [ticketName, setTicketName] = useState("")
    const [metricsData, setMetricsData] = useState(null);

    const [toast, setToast] = useState(null);
    const showToast = (msg, opts = {}) => setToast({ message: msg, ...opts });
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const initialAgent = location.state?.positionId || localStorage.getItem("currentAgent");
    const [agentName, setAgentName] = useState(initialAgent);
    
    // Helper function to get params from multiple sources
    const getParamValue = (paramName, localStorageKey, stateName = paramName) => {
        // Priority: URL params → location state → localStorage
        return searchParams.get(paramName) ||
            location.state?.[stateName] ||
            localStorage.getItem(localStorageKey);
    };


    useEffect(() => {
               // console.log("Access type detection:");
        // console.log("URL params:", {
        //     accountId: searchParams.get('accountId'),
        //     positionId: searchParams.get('positionId'),
        //     ticketId: searchParams.get('ticketId')
        // });
        // console.log("Location state:", location.state);

        (async () => {
            // Get values from URL, state, or localStorage (in that order)
            const accountId = getParamValue('accountId', 'selectedAccount');
            const positionId = getParamValue('positionId', 'currentAgent');
            const ticketId = getParamValue('ticketId', 'ticket');

            const urlStartDate = searchParams.get('startDate');
            const urlEndDate = searchParams.get('endDate');
            const savedStartDate = urlStartDate || localStorage.getItem('selectedStartDate');
            const savedEndDate = urlEndDate || localStorage.getItem('selectedEndDate');
            
            // Determine if this is external access
            const isExternalAccess = !!(searchParams.get('accountId') ||
                searchParams.get('positionId') ||
                searchParams.get('ticketId') ||
                searchParams.get('startDate') ||
                searchParams.get('endDate'));

            console.log('Access type:', isExternalAccess ? 'External' : 'Internal');

            if (isExternalAccess) {
                const missingParams = [];
                if (!accountId) missingParams.push('accountId');
                if (!positionId) missingParams.push('positionId');
                if (!ticketId) missingParams.push('ticketId');
                if (!urlStartDate) missingParams.push('startDate');
                if (!urlEndDate) missingParams.push('endDate');

                if (missingParams.length > 0) {
                    console.error('Missing required parameters for external access:', missingParams);
                    showToast(`Missing required parameters: ${missingParams.join(', ')}`, {
                        type: "error",
                        duration: 10000,
                        position: "bottom-right",
                        onClose: () => setToast(null),
                    });
                    setLoading(false);
                    return; // Stop execution if any parameter is missing
                }
                             // console.log('received data from URL params:', {
                //     accountId,
                //     positionId,
                //     ticketId,
                //     urlStartDate,
                //     urlEndDate
                // })

                if (!urlStartDate || !urlEndDate) {
                    const missing = [];
                    if (!urlStartDate) missing.push('startDate');
                    if (!urlEndDate) missing.push('endDate');
                    showToast(`Missing required parameters: ${missing.join(', ')}`, {
                        type: "error",
                        duration: 10000,
                        position: "bottom-right",
                        onClose: () => setToast(null),
                    });
                    return;
                }

                let validStartDate, validEndDate;

                try {
                    validStartDate = new Date(urlStartDate + 'T00:00:00'); // Add time to avoid timezone issues
                    validEndDate = new Date(urlEndDate + 'T00:00:00');
                    
                    // Check if dates are valid
                    if (validStartDate.toString() === 'Invalid Date' ||
                        validEndDate.toString() === 'Invalid Date') {
                        throw new Error('Invalid date format');
                    }

                    // console.log('Successfully parsed dates:', { validStartDate, validEndDate });

                } catch (error) {
                    console.error('Date parsing failed:', error);
                    showToast(`Invalid date format. Please use YYYY-MM-DD format.`, {
                        type: "error",
                        duration: 10000,
                        position: "bottom-right",
                        onClose: () => setToast(null),
                    });
                    return;
                }


                localStorage.setItem('selectedAccount', accountId);
                localStorage.setItem('currentAgent', positionId);
                localStorage.setItem('ticket', ticketId);
                localStorage.setItem('selectedStartDate', validStartDate.toISOString());
                localStorage.setItem('selectedEndDate', validEndDate.toISOString());

                setAccountName(accountId);
                setAgentName(positionId);
                setTicketName(ticketId);
                setStartDate(validStartDate);
                setEndDate(validEndDate);

            }
            else {
                if (savedStartDate) {
                    try {
                        const startDateObj = new Date(savedStartDate);
                        if (!isNaN(startDateObj.getTime())) {
                            setStartDate(startDateObj);
                        }
                    } catch (error) {
                        console.warn('Error parsing saved start date:', savedStartDate, error);
                    }
                }

                if (savedEndDate) {
                    try {
                        const endDateObj = new Date(savedEndDate);
                        if (!isNaN(endDateObj.getTime())) {
                            setEndDate(endDateObj);
                        }
                    } catch (error) {
                        console.warn('Error parsing saved end date:', savedEndDate, error);
                    }
                }

            }

            await fetchAccounts();

            // Set localStorage if coming from URL (external access)
            if (accountId) {
                setAccountName(accountId);
                await fetchAgents(accountId);
            }

            if (positionId) {
                setAgentName(positionId);
            }

            // Auto-fetch data if all parameters are available
            if (ticketId && accountId && positionId && savedStartDate && savedEndDate) {
                setLoading(true);
                try {
                    let finalStartDate = null;
                    let finalEndDate = null;
                    try {
                        const startDateObj = new Date(savedStartDate);
                        if (!isNaN(startDateObj.getTime())) {
                            finalStartDate = format(startDateObj, 'yyyy-MM-dd');
                        } else {
                            throw new Error('Invalid start date');
                        }
                    } catch (error) {
                        console.error('Invalid start date for API call:', savedStartDate);
                        showToast("Invalid start date format", {
                            type: "error",
                            duration: 4000,
                            position: "bottom-right",
                            onClose: () => setToast(null),
                        });
                        setLoading(false);
                        return;
                    }

                    try {
                        const endDateObj = new Date(savedEndDate);
                        if (!isNaN(endDateObj.getTime())) {
                            finalEndDate = format(endDateObj, 'yyyy-MM-dd');
                        } else {
                            throw new Error('Invalid end date');
                        }
                    } catch (error) {
                        console.error('Invalid end date for API call:', savedEndDate);
                        showToast("Invalid end date format", {
                            type: "error",
                            duration: 4000,
                            position: "bottom-right",
                            onClose: () => setToast(null),
                        });
                        setLoading(false);
                        return;
                    }


                    const requestPayload = {
                        eventType: "get_tickets",
                        userId: localStorage.getItem("userEmail"),
                        account_id: accountId,
                        position_ids: [positionId],
                        startDate: finalStartDate,
                        endDate: finalEndDate
                    };

                    // console.log('Auto-fetch request payload:', requestPayload);

                    const response = await api.post('/qa/query', requestPayload);
                    const data = response.data?.ticket_ids || [];
                    setTickets(data);
                    setTicketName(ticketId);
                    
                    // Track analytics with source info
                    await sendEventToApi("filterTicketId", {
                        email: localStorage.getItem("userEmail"),
                        page: 'quality-form',
                        selectedAccount: accountId,
                        selectedAgent: positionId,
                        ticketId: ticketId,
                        source: isExternalAccess ? 'external' : 'internal'
                    });

                } catch (error) {
                    console.error('Error fetching tickets:', error);
                    showToast("Error in fetching the tickets data", {
                        type: "error",
                        duration: 4000,
                        position: "bottom-right",
                        onClose: () => setToast(null),
                    });
                } finally {
                    setLoading(false);
                }
            } else if (isExternalAccess) {
                // External access but missing parameters - already handled above
                console.log('External access detected but parameters missing or invalid');
            }
        })();

        return () => {
            const isExternalAccess = !!(searchParams.get('accountId') ||
                searchParams.get('positionId') ||
                searchParams.get('ticketId') ||
                searchParams.get('startDate') ||
                searchParams.get('endDate'));
            if (!isExternalAccess) {
                localStorage.removeItem("currentAgent");
                localStorage.removeItem("ticket");
            }
        };
    }, [searchParams]);

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

    const fetchTickets = async (agentId) => {
        setLoading(true);
        try {
            const response = await api.post('/qa/query', {
                eventType: "get_tickets", userId: localStorage.getItem("userEmail"), account_id: accountName, position_ids: [agentId], startDate: startDate ? format(new Date(startDate), 'yyyy-MM-dd') : '',
                endDate: endDate ? format(new Date(endDate), 'yyyy-MM-dd') : ''
            });
            const data = response.data?.ticket_ids || [];
            setTickets(data);
            const savedTicket = localStorage.getItem('ticket');
            if (savedTicket) setTicketName(savedTicket)
        } catch (error) {
            console.error('Error fetching tickets:', error);
            showToast("Error in fetching the tickets data", {
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

    const handleAccountChange = async (value) => {
        setAccountName(value);
        setAgentName(null);
        setTickets([]);
        setTicketName(null);
        setMetricsData(null);
        localStorage.removeItem("currentAgent");
        localStorage.removeItem("ticket");
        await fetchAgents(value);
    };

    const handleAgentChange = async (value) => {
        setAgentName(value);
        setTickets([]);
        setTicketName(null);
        setMetricsData(null);
        localStorage.removeItem("ticket");
        await fetchTickets(value);
    };

    const handleFetchMetrics = async () => {
        setLoading(true);
        try {
            const response = await api.get('/qa/tickets', {
                params: {
                    accountId: accountName,
                    positionId: Array.isArray(agentName) ? agentName[0] : agentName,
                    ticketId: ticketName
                }
            });
            const tickets = response?.data?.tickets;
            setMetricsData(Array.isArray(tickets) && tickets.length > 0 ? tickets[0] : null);
        } catch (error) {
            console.error('Error fetching metrics:', error);
            showToast("Error in fetching the metrics data", {
                type: "error",
                duration: 4000,
                position: "bottom-right",
                onClose: () => setToast(null),
            })
            setMetricsData(null)
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (
            accountName &&
            agentName &&
            startDate &&
            endDate &&
            ticketName &&
            accounts.length > 0 &&
            agents.length > 0 &&
            tickets?.length > 0
        ) {
            handleFetchMetrics();
        }
    }, [accountName, agentName, startDate, endDate, accounts, agents, ticketName, tickets]);


    const AuditSummary = () => {
        const sentimentVariant = (sentiment) => {
            const value = (sentiment || '').toLowerCase();
            if (value === 'positive') return 'success';
            if (value === 'negative') return 'error';
            return 'processing';
        };

        const formatSentiment = (sentiment) =>
            (sentiment || 'Unknown')
                .toLowerCase()
                .replace(/^\w/, (c) => c.toUpperCase());

        const renderStatusIcon = (status, icons) => {
            if (status === 'pass') return <img src={icons.pass} alt="Pass" className="h-6 w-6" />;
            if (status === 'fail') return <img src={icons.fail} alt="Fail" className="h-6 w-6" />;
            return <img src={icons.neutral} alt="Neutral" className="h-6 w-6" />;
        };

        const AuditCard = ({
            type,
            data,
            mounted,
            icons,
        }) => {
            const isAI = type === 'ai';
            const scoreColor = data.score > 85 ? '!text-green-600' : '!text-red-600';

            return (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition-shadow duration-200">
                    <div className={`mb-6 flex items-center justify-between fade-in ${mounted ? 'show' : ''}`}>
                        <div>
                            <h3 className="text-base font-medium text-[#EE4B4A]">
                                {isAI ? 'AI Quality Audit Score: ' : 'Manual Quality Audit Score: '}
                                <span className={scoreColor}>{data?.score ? `${data.score}%` : '-'}</span>
                            </h3>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {data.criteria.map((criterion, index) => (
                            <div
                                key={`${type}-${criterion.label}`}
                                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                                style={{
                                    opacity: 0,
                                    animation: `riseIn 320ms ${80 + index * 40}ms ease-out forwards`,
                                    willChange: 'transform, opacity',
                                }}
                            >
                                {renderStatusIcon(criterion.status, icons)}
                                <p className="text-sm text-slate-700">{criterion.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            );
        };

        const [mounted, setMounted] = useState(false);
        const [copied, setCopied] = useState(false);

        useEffect(() => {
            const handle = requestAnimationFrame(() => setMounted(true));
            return () => cancelAnimationFrame(handle);
        }, []);

        const aiData = useMemo(() => {
            if (!metricsData) return null;
            const aiMetrics = metricsData.ai_metrics || {};
            return {
                score: metricsData.qa_percentage ?? 0,
                duration_seconds: metricsData.duration_seconds ?? 'N/A',
                ticket_url: metricsData.ticket_url ?? 'N/A',
                lookup_key: metricsData.lookup_key ?? 'N/A',
                ticketId: metricsData.ticket_id ?? 'N/A',
                agentName: metricsData.assignee_name ?? 'N/A',
                sentiment: metricsData.sentiment ?? 'Unknown',
                issue: metricsData.issue ?? 'N/A',
                feedback: metricsData.feedback ?? 'N/A',
                channel: metricsData.channel ?? 'N/A',
                tags: metricsData.tags ?? 'N/A',
                direction: metricsData.direction ?? 'N/A',
                lob: metricsData.lob ?? 'N/A',
                aiMetrics: {
                    ticket_disposition: aiMetrics.ticket_disposition || 'N/A',
                    resolution: aiMetrics.resolution || 'N/A',
                    nps_recognition: aiMetrics.nps_recognition || 'N/A',
                    call_escalation_triggers: aiMetrics.call_escalation_triggers || 'N/A',
                    markdown_drivers: aiMetrics.markdown_drivers || 'N/A',
                },
                criteria: [
                    { label: 'Correct Resolution', status: metricsData.correct_resolution === 1 ? 'pass' : 'fail' },
                    { label: 'Accurate Information', status: metricsData.accurate_information === 1 ? 'pass' : 'fail' },
                    { label: 'Professional Manner', status: metricsData.professional_manner === 1 ? 'pass' : 'fail' },
                    { label: 'Complete Documentation', status: metricsData.complete_documentation === 1 ? 'pass' : 'fail' },
                    { label: 'Tool Utilization', status: metricsData.tool_utilization === 1 ? 'pass' : 'fail' },
                    { label: 'Proper Escalation', status: metricsData.proper_escalation === 1 ? 'pass' : 'fail' },
                    { label: 'Correct Orthography', status: metricsData.correct_ortography === 1 ? 'pass' : 'fail' },
                    { label: 'Has Empathy', status: metricsData.has_empathy === 1 ? 'pass' : 'fail' },
                ],
            };
        }, [metricsData]);

        const manualData = useMemo(() => {
            if (!metricsData) return null;
            const pickStatus = (val) =>
                val === 1 ? 'pass' : val === 0 ? 'fail' : 'neutral';
            return {
                score: metricsData.manual_percentage_score ?? 0,
                ticketId: metricsData.ticket_id ?? 'N/A',
                agentName: metricsData.assignee_name ?? 'N/A',
                sentiment: metricsData.sentiment ?? 'Unknown',
                issue: metricsData.issue ?? 'N/A',
                feedback: metricsData.manual_feedback ?? 'N/A',
                criteria: [
                    { label: 'Correct Resolution', status: pickStatus(metricsData.manual_correct_resolution) },
                    { label: 'Accurate Information', status: pickStatus(metricsData.manual_accurate_information) },
                    { label: 'Professional Manner', status: pickStatus(metricsData.manual_professional_manner) },
                    { label: 'Complete Documentation', status: pickStatus(metricsData.manual_complete_documentation) },
                    { label: 'Tool Utilization', status: pickStatus(metricsData.manual_tool_utilization) },
                    { label: 'Proper Escalation', status: pickStatus(metricsData.manual_proper_escalation) },
                    { label: 'Correct Orthography', status: pickStatus(metricsData.manual_correct_ortography) },
                    { label: 'Has Empathy', status: pickStatus(metricsData.manual_has_empathy) },
                ],
            };
        }, [metricsData]);

        if (!metricsData || !aiData) {
            return (
                <div className="rounded-2xl bg-white p-8 shadow-sm">
                    <NoContent
                        className="!w-full"
                        title="No data available"
                        message="Please select account, agent, and ticket to view audit summary."
                    />
                </div>
            );
        }

        const sourceUrl = aiData.ticket_url || 'N/A';
        const canCopy = sourceUrl && sourceUrl !== 'N/A';

        const handleCopy = async () => {
            if (!canCopy) return;
            try {
                await navigator.clipboard.writeText(sourceUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            } catch (err) {
                console.error('Copy failed:', err);
            }
        };

        return (
            <div className="rounded-3xl bg-white p-8 shadow-xl">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-[20px] !font-tenon font-medium text-[#05004E]">
                            AI Quality Audit v/s Manual Quality Audit
                        </h2>
                        <p className="text-sm text-slate-500">Audit Summary</p>
                    </div>
                </div>

                <div
                    className={`panel-in mb-6 rounded-2xl border border-[#E2E2E2] bg-slate-50 p-4 ${mounted ? 'show' : ''}`}
                    style={{ transitionDelay: '60ms' }}
                >
                    <div className="grid gap-4 lg:grid-cols-3">
                        <div className="rounded-xl border border-[#E2E2E2] bg-white p-4">
                            <p className="text-[#EE4B4A] mb-2 text-base py-1 font-semibold">
                                Ticket ID - {aiData.ticketId}
                            </p>

                            <p className="text-base py-1 text-[#2B2C30]">
                                <span className="font-semibold">Agent Name:</span> {aiData.agentName}
                            </p>

                            <p className="text-base py-1 text-[#2B2C30]">
                                <span className="font-semibold">Sentiment:</span>{' '}
                                <Chip className="!px-2 !py-1" variant={sentimentVariant(aiData.sentiment)}>
                                    {formatSentiment(aiData.sentiment)}
                                </Chip>
                            </p>

                            <p className="text-base py-1 text-[#2B2C30]">
                                <span className="font-semibold">Duration (hh:mm:ss):</span>{' '}
                                {aiData.duration_seconds || 'N/A'}
                            </p>
                            <p className="text-base py-1 text-[#2B2C30] break-all">
                                <span className="font-semibold">Search Key:</span> {aiData.lookup_key || 'N/A'}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-base py-1 text-[#2B2C30]">
                                <span className="font-semibold">Source System URL:</span>
                                <span className="max-w-[260px] truncate" title={aiData.ticket_url}>
                                    {canCopy ? (
                                        <a
                                            href={aiData.ticket_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 underline"
                                        >
                                            View Source
                                        </a>
                                    ) : (
                                        aiData.ticket_url || 'N/A'
                                    )}
                                </span>
                                {true && (
                                    copied ? (
                                        <>
                                            <img src={tick} alt="Copied" className="h-5 w-5" />
                                            <span className="text-xs font-medium text-blue-700">Copied</span>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleCopy}
                                            className="inline-flex items-center text-blue-600 hover:text-blue-700"
                                        >
                                            <img src={copy} alt="Copy" className="h-5 w-5" />
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#E2E2E2] bg-white p-4">
                            <p className="mb-3 text-base font-semibold text-[#16A34A]">
                                AI Metrics
                            </p>
                            <p className="text-base py-1 text-[#2B2C30] break-all">
                                <span className="font-semibold">Ticket Disposition:</span>{' '}
                                {aiData.aiMetrics.ticket_disposition}
                            </p>
                            <p className="text-base py-1 text-[#2B2C30] break-all">
                                <span className="font-semibold">Issue:</span>{' '}
                                {aiData.issue}
                            </p>
                            <p className="text-base py-1 text-[#2B2C30] break-all">
                                <span className="font-semibold">Resolution:</span>{' '}
                                {aiData.aiMetrics.resolution}
                            </p>
                            <p className="text-base py-1 text-[#2B2C30] break-all">
                                <span className="font-semibold">NPS Recognition:</span>{' '}
                                {aiData.aiMetrics.nps_recognition}
                            </p>
                            <p className="text-base py-1 text-[#2B2C30] break-all">
                                <span className="font-semibold">Call Escalation Triggers:</span>{' '}
                                {aiData.aiMetrics.call_escalation_triggers}
                            </p>
                            <p className="text-base py-1 text-[#2B2C30] break-all">
                                <span className="font-semibold">Markdown Drivers:</span>{' '}
                                {aiData.aiMetrics.markdown_drivers}
                            </p>
                        </div>

                        <div className="rounded-xl border border-[#E2E2E2] bg-white p-4">
                            <p className="mb-3 text-base font-semibold text-[#16A34A]">
                                Channel & Context
                            </p>
                            <p className="text-base py-1 text-[#2B2C30] break-all">
                                <span className="font-semibold">Channel:</span>{' '}
                                {aiData.channel}
                            </p>
                            <p className="text-base py-1 text-[#2B2C30] break-all">
                                <span className="font-semibold">CRM Tags:</span>{' '}
                                {aiData.tags}
                            </p>
                            <p className="text-base py-1 text-[#2B2C30] break-all">
                                <span className="font-semibold">Direction:</span>{' '}
                                {aiData.direction}
                            </p>
                            <p className="text-base py-1 text-[#2B2C30] break-all">
                                <span className="font-semibold">Line of Business:</span>{' '}
                                {aiData.lob}
                            </p>
                        </div>

                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <AuditCard
                        type="ai"
                        data={aiData}
                        mounted={mounted}
                        icons={{ pass: tickIcon, fail: crossIcon, neutral: minusIcon, copy, copied: tick }}
                    />
                    <AuditCard
                        type="manual"
                        data={manualData}
                        mounted={mounted}
                        icons={{ pass: tickIcon, fail: crossIcon, neutral: minusIcon }}
                    />
                </div>
                <div>
                    <p className="mt-4 text-base text-[#2B2C30]">
                        <span className="font-semibold">
                            Feedback: <br />
                        </span>{' '}
                        {aiData?.feedback}
                    </p>
                </div>
            </div>
        );
    }

    const TranscriptsAndForms = () => {

        return (
            <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="w-full">
                        <TicketTranscript />
                    </div>

                    <div className="w-full rounded-3xl bg-white p-2 shadow-md">
                        <ManualQualityForm />
                    </div>
                </div>
            </div>
        );
    }


    const ManualQualityForm = () => {
        const [mounted, setMounted] = useState(false);
        useEffect(() => {
            const t = requestAnimationFrame(() => setMounted(true));
            return () => cancelAnimationFrame(t);
        }, []);
        const initialResponses = useMemo(() => ({
            correct_resolution: metricsData?.manual_correct_resolution === 1 ? "Yes" : metricsData?.manual_correct_resolution === 0 ? "No" : undefined,
            accurate_information: metricsData?.manual_accurate_information === 1 ? "Yes" : metricsData?.manual_accurate_information === 0 ? "No" : undefined,
            professional_manner: metricsData?.manual_professional_manner === 1 ? "Yes" : metricsData?.manual_professional_manner === 0 ? "No" : undefined,
            complete_documentation: metricsData?.manual_complete_documentation === 1 ? "Yes" : metricsData?.manual_complete_documentation === 0 ? "No" : undefined,
            tool_utilization: metricsData?.manual_tool_utilization === 1 ? "Yes" : metricsData?.manual_tool_utilization === 0 ? "No" : undefined,
            proper_escalation: metricsData?.manual_proper_escalation === 1 ? "Yes" : metricsData?.manual_proper_escalation === 0 ? "No" : undefined,
            correct_ortography: metricsData?.manual_correct_ortography === 1 ? "Yes" : metricsData?.manual_correct_ortography === 0 ? "No" : undefined,
            has_empathy: metricsData?.manual_has_empathy === 1 ? "Yes" : metricsData?.manual_has_empathy === 0 ? "No" : undefined,
        }), [metricsData]);

        const [responses, setResponses] = useState(initialResponses);
        const [desc, setDesc] = useState(metricsData?.manual_feedback || "");
        const [open, setOpen] = useState(false);

        useEffect(() => {
            setResponses(initialResponses);
            setDesc(metricsData?.manual_feedback || "");
        }, [initialResponses, metricsData]);

        const questions = [
            { id: "correct_resolution", question: "Correct resolution: Was the Ninja able to provide correct resolution?" },
            { id: "accurate_information", question: "Accurate Information: Was the Ninja able to provide complete/accurate information?" },
            { id: "professional_manner", question: "Professional Manner: Did the agent converse in a professional manner?" },
            { id: "complete_documentation", question: "Complete Documentation: Was the documentation complete and accurate?" },
            { id: "tool_utilization", question: "Tool Utilization: Did the agent utilize the right resources?" },
            { id: "proper_escalation", question: "Proper Escalation: Did the agent properly escalate the concern if applicable?" },
            { id: "correct_ortography", question: "Correct Orthography: Was the transaction free of orthography error?" },
            { id: "has_empathy", question: "Has Empathy: Did the agent deliver an empathy statement when appropriate?" },
        ];


        const isFormComplete = useMemo(() => {
            return questions.every((q) => responses[q.id] !== undefined)
        }, [responses, questions]);

        const handleResponseChange = (id, value) => {
            setResponses((prev) => ({
                ...prev,
                [id]: value,
            }));
        };


        const handleSubmit = async (e) => {
            e.preventDefault();
            const payload = Object.keys(responses).reduce((acc, key) => {
                acc[key] = responses[key] === "Yes" ? 1 : 0;
                return acc;
            }, {});

            payload.feedback = desc;
            setLoading(true);
            try {
                await api.post('/qa/query', {
                    eventType: "update_form",
                    userId: localStorage.getItem("userEmail"),
                    account_id: accountName,
                    position_ids: agentName,
                    ticket_id: ticketName,
                    form_data: payload
                });
                showToast("Form submitted successfully", {
                    type: "success",
                    duration: 4000,
                    position: "bottom-right",
                    onClose: () => setToast(null),
                })
            } catch (error) {
                console.error('Error fetching metrics:', error);
                showToast("Error in fetching the metrics data", {
                    type: "error",
                    duration: 4000,
                    position: "bottom-right",
                    onClose: () => setToast(null),
                })
                setMetricsData(null)
            } finally {
                setLoading(false);
                handleFetchMetrics();
            }
        };

        const handleClear = () => {
            setResponses({});
            setDesc("");
        };

        return (
            <div>
                <div className={`p-2 bg-white rounded fade-in ${mounted ? "show" : ""}`}>
                    <div className="p-2 pb-0 text-[#05004E] font-semibold !font-tenon text-xl leading-[32px] tracking-[0px]">Manual Quality Form</div>
                    <div className='text-gray-500 pl-2'>Please answer in Yes or No</div>
                    {questions.map((q, index) => (
                        <div key={q.id} className="m-4">
                            <p className="mb-2 text-[#111827] font-medium">{index + 1}. {q.question} <span className='text-red-600'>*</span></p>
                            <div className="flex gap-4">
                                <Radio
                                    id={`q_${q.id}_yes`}
                                    name={`q_${q.id}`}
                                    value="Yes"
                                    checked={responses[q.id] === "Yes"}
                                    onChange={() => handleResponseChange(q.id, "Yes")}
                                    label="Yes"
                                    className='[&_.radio-label]:text-[14px]'
                                />
                                <Radio
                                    id={`q_${q.id}_no`}
                                    name={`q_${q.id}`}
                                    value="No"
                                    checked={responses[q.id] === "No"}
                                    onChange={() => handleResponseChange(q.id, "No")}
                                    label="No"
                                />
                            </div>
                        </div>
                    ))}
                    <div className="m-4">
                        <TextArea
                            label="9. How can the agent improve his/her interaction with the customer?"
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="Please add your feedback here"
                            className='!w-full'
                        />
                    </div>
                    <div className="flex gap-4 justify-end">
                        <Button onClick={handleClear} className="btn-secondary-active !px-5 !py-2">Clear</Button>
                        <Button onClick={() => setOpen(true)} className={!isFormComplete ? "btn-default-disabled  !px-5 !py-2" : "btn-default-active !px-5 !py-2"}>Submit</Button>
                    </div>
                </div>
                <Modal
                    isOpen={open}
                    onClose={() => setOpen(false)}
                    title="Submit Confirmation"
                    primaryButton={{
                        label: "Submit",
                        onClick: handleSubmit,
                        className: "!px-4 !py-2"
                    }}
                    secondaryButton={{
                        label: "Cancel",
                        onClick: () => setOpen(false),
                        className: "!px-4 !py-2"
                    }}

                >
                    <div className="space-y-4">
                        <p>Are you sure you want to submit this form?</p>
                        <p className='text-sm text-gray-500'>This will save your responses and cannot be undone.</p>
                    </div>
                </Modal>
            </div>
        );
    };

    // TranscriptView.jsx
    const TranscriptView = ({ metricsData }) => {
        const isNewTranscript = !!metricsData?.transcript?.new_transcript;

 // When new_transcript is true, data comes from `metricsData.dialogue` (array of { sequence, speaker, text })
        // Otherwise, it comes from `metricsData.transcript.conversation` (array with { speaker, message, timestamp/time, ... })
        const conversation = isNewTranscript
            ? (metricsData?.transcript?.dialogue ?? [])
            : (metricsData?.transcript?.conversation ?? []);

        const agentName = metricsData?.assignee_name?.toLowerCase() || '';

        const isAgentSpeaker = (speakerRaw = '') => {
            const lowered = speakerRaw.trim().toLowerCase();
            return (!!agentName && lowered.includes(agentName)) || lowered.includes('agent');
        };

        const getInitials = (name = 'Unknown Speaker') =>
            name
                .split(' ')
                .map((p) => p?.[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase();

        if (!conversation?.length) {
            return <NoContent title="No Conversation Available" className="!w-full" />;
        }

        return (
            <div className="space-y-1">
                <div className="max-h-[32rem] overflow-y-auto pr-2 space-y-3">
                    {conversation?.map((chat, index) => {
                        const speaker = chat?.speaker?.trim() || 'Unknown Speaker';
                        const initials = getInitials(speaker);
                        const time = chat?.timestamp || chat?.time || '';
                        const isAgent = isAgentSpeaker(speaker);

                        // Read message field depending on format
                        const message =
                            (isNewTranscript ? chat?.text : chat?.message) ??
                            chat?.text ??
                            'No message available';

                        const key = chat?.id ?? chat?.sequence ?? `${index}-${speaker}`;

                        if (!isAgent) {
                            // Customer/other side (left)
                            return (
                                <div key={key} className="flex items-start gap-3">
                                    <div className="mt-[2px] flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FBD9D9] text-[13px] font-semibold uppercase text-[#1F2533]">
                                        {initials}
                                    </div>

                                    <div className="flex flex-col">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-[13px] font-semibold text-[#1F2533]">
                                                {speaker}
                                            </span>
                                            <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#A5A7BD]">
                                                {time}
                                            </span>
                                        </div>

                                        <div className="mt-[6px] inline-flex max-w-[420px] items-center rounded-xl border !rounded-tl-none border-[#E7E9F4] bg-white px-4 py-2 text-sm leading-[1.55] text-[#515151] shadow-[0px_12px_24px_rgba(15,23,42,0.08)] break-words whitespace-pre-wrap">
                                            {message}
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        
                        // Agent side (right)
                        return (
                            <div key={key} className="flex flex-row-reverse items-start gap-3">
                                <div className="mt-[2px] flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FBD9D9] text-[13px] font-semibold uppercase text-[#1F2533]">
                                    {initials}
                                </div>

                                <div className="flex flex-col items-end">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-[13px] font-semibold text-[#1F2533]">
                                            {speaker}
                                        </span>
                                        <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#A5A7BD]">
                                            {time}
                                        </span>
                                    </div>

                                    <div
                                        className="inline-flex items-center gap-[6.67px] border-solid px-[16.02px] py-[10.68px] text-sm leading-[1.55] tracking-[0.01em] rounded-xl rounded-tr-none bg-[#FBD9D9] text-[#1F2533] border-[#FF5757] break-words whitespace-pre-wrap"
                                    >
                                        {message}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const TicketTranscript = () => {
        const [mounted, setMounted] = useState(false);
        useEffect(() => {
            const t = requestAnimationFrame(() => setMounted(true));
            return () => cancelAnimationFrame(t);
        }, []);
        const auditData = {
            ticketId: metricsData.ticket_id || "N/A",
            agentName: metricsData.assignee_name || "N/A",
            sentiment: toTitleCase(metricsData.sentiment || "Unknown"),
            issue: metricsData.issue || "N/A",
            feedback: metricsData.feedback || "N/A",
        };

        const [openItem, setOpenItem] = useState('item1');

        // const conversation = metricsData?.transcript?.new_transcript ? metricsData?.dialogue : metricsData.transcript?.conversation || [];
        const items = [
            {
                id: "item1",
                title: <div className="font-medium !font-tenon text-[#05004E]"> View Conversation</div>,
                content: (
                    <TranscriptView metricsData={metricsData} />
                ),
            },
            {
                id: "item2",
                title: <div className="font-medium !font-tenon text-[#05004E]"> View Raw Transcript</div>,
                content: (
                    <RawTranscript />
                ),
            },
        ]

        return (
            <div>
                <div className="p-6 bg-white rounded-3xl shadow-md mx-auto">
                    <div className={`flex justify-between items-center mb-6 fade-in ${mounted ? "show" : ""}`}>
                        <div>
                            <h2 className="text-xl !font-tenon font-semibold text-[#05004E]">
                                Ticket Transcript
                            </h2>
                            <p className="text-gray-500">Ticket Summary</p>
                        </div>
                    </div>


                    <div
                        className={`p-1 mb-6 panel-in ${mounted ? "show" : ""}`}
                        style={{ transitionDelay: "70ms" }}
                    >
                        <p className="text-[#EE4B4A] text-base font-semibold mb-2">
                            Ticket ID - {auditData.ticketId}
                        </p>
                        <p className="text-[#2B2C30]">
                            <span className='font-semibold text-base'>Agent Name:</span> {auditData.agentName}
                        </p>
                        <p className="text-[#2B2C30]">
                            <span className='font-semibold text-base'>Sentiment:</span> {auditData.sentiment}
                        </p>
                        <p className="text-[#2B2C30]">
                            <span className='font-semibold text-base'>Issue:</span> {auditData.issue}
                        </p>

                        <p className="text-[#2B2C30] mt-4">
                            <span className='font-semibold text-base'>Feedback:</span> {auditData.feedback}
                        </p>

                        <div className='mt-4'>
                            <div className="space-y-3">
                                {items.map(({ id, title, content }) => {
                                    const isOpen = openItem === id;

                                    return (
                                        <div
                                            key={id}
                                            className="overflow-hidden rounded-xl border border-[#E2E2E2] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setOpenItem((prev) => (prev === id ? null : id))}
                                                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#FAFAFF]"
                                            >
                                                {title}
                                                <span
                                                    className={`text-xl font-semibold text-[#7B7F9E] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                                                        }`}
                                                >
                                                    ▾
                                                </span>
                                            </button>

                                            <div
                                                className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${isOpen ? 'max-h-[1200px]' : 'max-h-0'
                                                    }`}
                                            >
                                                <div
                                                    className={`px-5 text-sm leading-relaxed text-[#444A5F] transition-all duration-200 ${isOpen ? 'opacity-100 pb-5 pt-3' : 'opacity-0 pb-0 pt-0'
                                                        }`}
                                                >
                                                    {content}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div >
        )
    }


    const RawTranscript = () => {
        const rawTranscript = metricsData.transcript?.raw_transcript || "No raw transcript available";
        return (
            <div className='my-4 max-h-[32rem] h-[32rem] overflow-y-auto pr-2 space-y-3'>
                <p style={{ overflowWrap: "break-word" }} className="text-[#2B2C30]">
                    {rawTranscript}
                </p>
            </div>
        )
    }

    const handleSelectTicket = (value) => {
        setTicketName(value);
        setMetricsData(null);
        (async () => {
            const payloadContext = {
                email: localStorage.getItem("userEmail"),
                // clientId: GOOGLE_CLIENT_ID,
                page: 'quality-form',
                startDate: startDate ? format(new Date(startDate), "yyyy-MM-dd") : null,
                endDate: endDate ? format(new Date(endDate), "yyyy-MM-dd") : null,
                selectedAccount: accountName,
                selectedAgent: Array.isArray(agentName) ? agentName[0] : agentName,
                ticketId: value,
                source: 'internal'
            };

            await sendEventToApi("filterTicketId", payloadContext);
        })();
    };

    const tabData = [
        {
            label: <span className="!font-tenon">AI & Manual Quality Audit</span>,
            content: <AuditSummary />,
        },
        {
            label: <span className="!font-tenon">Transcripts & Manual Quality Form</span>,
            content: <TranscriptsAndForms />,
        },
    ];

    const handleDateApply = React.useCallback((start, end) => {
        setStartDate(prev => {
            if (!start && !prev) return prev;
            if (!start || !prev) return start || null;
            return start.getTime() !== prev.getTime() ? start : prev;
        });
        setEndDate(prev => {
            if (!end && !prev) return prev;
            if (!end || !prev) return end || null;
            return end.getTime() !== prev.getTime() ? end : prev;
        });
    }, []);


    const handleApply = () => {
        if (!accountName || !agentName || !startDate || !endDate || !ticketName) {
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
        setTicketName(null);
        localStorage.removeItem('selectedAccount');
        localStorage.removeItem('selectedAgent');
        localStorage.removeItem('selectedStartDate');
        localStorage.removeItem('selectedEndDate');
    }

    return (
        <div>
            {loading && <Loader />}

            <div className="border border-[#E2E2E2] p-6">
                <div className="font-semibold text-[#26203B] mb-2 text-xl leading-none tracking-normal">
                    Account & Agent Details
                </div>
                <div className="font-medium text-[#313133] text-sm leading-none tracking-normal">
                    Enter the details for Account name and Agents in order to see the details.
                </div>

                <div className='mt-6 flex gap-4'>
                    <div className='mt-[5px] flex gap-2 flex-col'>
                        <span className='font-medium text-[#111827] text-base leading-none tracking-normal'>Date Range <span className='text-[#ef4444]'>*</span></span>
                        <DateRangePicker
                            startDate={startDate}
                            endDate={endDate}
                            onApply={handleDateApply}
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
                            onChange={handleAgentChange}
                            placeholder="Select Agents"
                        />
                    </div>
                </div>
                <div className='mt-4'>
                    <InputSelect
                        title="Tickets"
                        required
                        options={tickets?.map(item => ({
                            label: item,
                            value: item
                        }))}
                        value={ticketName}
                        showSelectAll={true}
                        onChange={handleSelectTicket}
                        placeholder="Select Tickets"
                    />
                </div>
                <div className="flex gap-4 justify-end">
                    <Button onClick={handleClear} className="btn-secondary-active !px-5 !py-2">Clear</Button>
                    {/* <Button onClick={handleApply} className="btn-default-active !px-5 !py-2">Apply</Button> */}
                </div>
            </div>

            <div className="my-8">
                {metricsData ? <Tabs className='!max-w-full [&_.tabs-header]:text-[16px] !font-sans' tabs={tabData} /> : <NoContent className='!w-full' />}
            </div>
            {toast && <Toast {...toast} />}
        </div>
    );
}

export default QualityForm
