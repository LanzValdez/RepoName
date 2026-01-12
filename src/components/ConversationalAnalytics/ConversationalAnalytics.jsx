import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { InputSelect, Button, Loader, NoContent, Toast } from '@supportninja/ui-components';
import DateRangePicker from '../common/DateRangePicker';
import ComplaintDetection from './Charts/ComplaintDetection';
import DashboardLayout from './Charts/DashboardLayout';
import CallEscalationTrends from './Charts/CallEscalation';
import CustomerVerbatimTrend from './Charts/CustomerVerbatim';
import CommunicationStyleImpact from './Charts/CommunicationStyle';
import TopMarkdowns from './Charts/TopMarkdowns';
import chatBot from "../../assets/icons/chat-bot.svg";
import ChatBot from './ChatBot';
import { sortBy, toTitleCase } from '../common/strings';
import api from '../../api/axios';
import { format } from "date-fns";
import { isEmptyObject } from '../common/strings';

const HelpBubble = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Need help? Chat with Jin!"
    className="absolute right-[4%] top-7 rounded-[18px] rounded-tr-none
           bg-gradient-to-tr from-rose-500/80 via-rose-400/35 to-transparent p-[2px]
           shadow-[0_14px_28px_-10px_rgba(225,29,72,.35)] focus:outline-none 
           focus-visible:ring-2 focus-visible:ring-rose-400"
  >
    <div className="relative w-full rounded-[18px] rounded-tr-none
                bg-gradient-to-tr from-rose-50 to-rose-100 
                px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]">
      <span className="pointer-events-none absolute -left-8 -top-4 h-16 w-16 rounded-full bg-white/70 blur-2xl" />

      <p className="text-[16px] font-semibold leading-6 tracking-[-0.01em] text-indigo-900">
        Need Help?
      </p>
      <p className="text-[12px] font-light leading-4 text-gray-700">
        Chat with our bot
      </p>
    </div>
  </button>
);

const InfoTooltip = ({ text }) => {
  if (!text) return null;

  return (
    <div className="relative inline-flex items-center group">
      <button
        type="button"
        aria-label="Info"
        className="grid h-7 w-7 place-items-center rounded-full bg-white ring-1 ring-slate-200 text-slate-500 hover:text-slate-700 hover:ring-slate-300 transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 22a10 10 0 1 0-10-10 10.011 10.011 0 0 0 10 10Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M12 17v-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 7h.01"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div
        className="
          pointer-events-none opacity-0 translate-y-1
          group-hover:opacity-100 group-hover:translate-y-0
          group-focus-within:opacity-100 group-focus-within:translate-y-0
          transition
          absolute right-0 top-[calc(100%+8px)]
          z-40
          w-[320px]
          rounded-xl
          bg-[#111827]
          text-white
          text-[12px]
          leading-5
          shadow-[0_12px_30px_rgba(0,0,0,0.25)]
          p-3
        "
      >
        <div className="absolute -top-2 right-3 h-0 w-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-[#111827]" />
        {text}
      </div>
    </div>
  );
};

const ChartPanel = ({ title, helpText, children, className = "" }) => {
  return (
    <div className={`rounded-xl p-2 panel !shadow-md relative ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-[#0E0D5D] text-base panel__title font-bold text-left">
          {title}
        </div>
        <div className="shrink-0">
          <InfoTooltip text={helpText} />
        </div>
      </div>
      <div className="mt-2">
        {children}
      </div>
    </div>
  );
};

const ConversationalAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [accountName, setAccountName] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [lobs, setLobs] = useState([]);
  const [channels, setChannels] = useState([]);
  const [agents, setAgents] = useState([]);
  const [metricsData, setMetricsData] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, opts = {}) => setToast({ message: msg, ...opts }), []);

  const [agentName, setAgentName] = useState([]);
  const [lobName, setLobName] = useState([]);
  const [channelName, setChannelName] = useState([]);

  const panelRef = useRef(null);

  const tooltipTexts = useMemo(() => ({
    complaint: "Percentages are based on ticket disposition for the selected date range. Colored slices are the sentiments.",
    escalation: "Data is identified based on potential escalation triggers for each ticket.",
    commStyle: "Based on identified keywords or phrases if a customer is more likely to be a promoter or a detractor.",
    verbatim: "Current work in progress.",
    markdowns: "Markdowns based on the 4Ps RCA Framework identified from each ticket.",
  }), []);

  const accountOptions = useMemo(
    () => (accounts?.map(item => ({ label: item.account_name, value: item.account_id })) ?? []),
    [accounts]
  );
  const lobOptions = useMemo(
    () => (lobs?.map(item => ({ label: item, value: item })) ?? []),
    [lobs]
  );
  const channelOptions = useMemo(
    () => (channels?.map(item => ({ label: toTitleCase(item), value: item })) ?? []),
    [channels]
  );
  const agentOptions = useMemo(
    () => (agents?.map(item => ({ label: item?.agent_name, value: item })) ?? []),
    [agents]
  );

  // Init
  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/qa/accounts");
      const data = response.data?.account_details || [];
      setAccounts(sortBy(data, "account_name", { order: "asc" }));
    } catch (error) {
      console.error("Error fetching accounts:", error);
      showToast("Error in fetching the accounts data", {
        type: "error",
        duration: 4000,
        position: "bottom-right",
        onClose: () => setToast(null),
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const savedStartDate = localStorage.getItem("selectedStartDate");
      const savedEndDate = localStorage.getItem("selectedEndDate");

      await fetchAccounts();
      if (!mounted) return;

      if (savedStartDate) setStartDate(new Date(savedStartDate));
      if (savedEndDate) setEndDate(new Date(savedEndDate));
    })();
    return () => { mounted = false; };
  }, [fetchAccounts]);

    // Data fetchers
  const fetchLobs = useCallback(async (accountId) => {
    setLoading(true);
    try {
      const response = await api.get("/qa/query", {
        params: { account_id: accountId, resource_type: 'lobs' },
      });
      const data = response.data?.lobs || [];
      setLobs(data);
    } catch (error) {
      console.error("Error fetching LOBS:", error);
      showToast("Error in fetching the lobs data", {
        type: "error",
        duration: 4000,
        position: "bottom-right",
        onClose: () => setToast(null),
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchChannels = useCallback(async (accountId) => {
    setLoading(true);
    try {
      const response = await api.get("/qa/query", {
        params: { account_id: accountId, resource_type: 'channels' },
      });
      const data = response.data?.channels || [];
      setChannels(data);
    } catch (error) {
      console.error("Error fetching Channels:", error);
      showToast("Error in fetching the channel data", {
        type: "error",
        duration: 4000,
        position: "bottom-right",
        onClose: () => setToast(null),
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchAgents = useCallback(async (lobsArr) => {
    setLoading(true);
    try {
      const response = await api.get("/qa/query", {
        params: {
          account_id: accountName,
          resource_type: 'agents',
          lob: (lobsArr || []).join(','),
        },
      });
      const data = response.data?.agents || [];
      setAgents(data);
    } catch (error) {
      console.error("Error fetching Agents:", error);
      showToast("Error in fetching the agent data", {
        type: "error",
        duration: 4000,
        position: "bottom-right",
        onClose: () => setToast(null),
      });
    } finally {
      setLoading(false);
    }
  }, [accountName, showToast]);

    // Close on click outside (uses chatOpen + setChatOpen)
  useEffect(() => {
    if (!chatOpen) return;
    const onDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setChatOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [chatOpen]);

  // Close on Esc
  useEffect(() => {
    if (!chatOpen) return;
    const onKey = (e) => e.key === "Escape" && setChatOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chatOpen]);

  // Handlers
  const handleAccountChange = useCallback(async (value) => {
    setAccountName(value);
    setAgentName([]);
    setLobName([]);
    setChannelName([]);
    await fetchLobs(value);
    await fetchChannels(value);
  }, [fetchLobs, fetchChannels]);

  const handleLobChange = useCallback(async (value) => {
    setLobName(value);
    setAgentName([]);
    if (value && value?.length > 0) await fetchAgents(value);
  }, [fetchAgents]);

  const handleSelectChannel = useCallback((value) => {
    setChannelName(value);
  }, []);

  const handleSelectAgent = useCallback((value) => {
    setAgentName(value);
  }, []);

  const handleDateApply = useCallback((start, end) => {
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

  const formatDate = useCallback((d) => (d ? format(new Date(d), "yyyy-MM-dd") : ""), []);

  const handleFetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.post("/qa/query", {
        eventType: "conversation_analytics",
        account_id: accountName,
        agents: agentName,
        lob: lobName,
        channel: channelName,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      });
      setMetricsData(response?.data || null);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      showToast("Error in fetching the metrics data", {
        type: "error",
        duration: 4000,
        position: "bottom-right",
        onClose: () => setToast(null),
      });
    } finally {
      setLoading(false);
    }
  }, [accountName, agentName, lobName, channelName, startDate, endDate, formatDate, showToast]);

  const handleApply = useCallback(() => {
    if (!accountName || !agentName || !startDate || !endDate || !lobName || !channelName) {
      showToast("Please fill all the required fields", {
        type: "error",
        duration: 9000,
        position: "bottom-right",
        onClose: () => setToast(null),
      });
      return;
    }
    handleFetchMetrics();
  }, [accountName, agentName, startDate, endDate, lobName, channelName, handleFetchMetrics, showToast]);

  useEffect(() => {
    const canAutoFetch =
      accountName &&
      (agentName && agentName?.length > 0) &&
      (lobName && lobName?.length > 0) &&
      (channelName && channelName?.length > 0) &&
      startDate &&
      endDate &&
      accounts.length > 0 &&
      agents.length > 0 &&
      lobs.length > 0 &&
      channels.length > 0;

    if (canAutoFetch) handleFetchMetrics();
  }, [
    accountName,
    agentName,
    lobName,
    channelName,
    startDate,
    endDate,
    accounts.length,
    agents.length,
    lobs.length,
    channels.length,
    handleFetchMetrics
  ]);

  const handleClear = useCallback(() => {
    setAccountName(null);
    setLobName(null);
    setChannelName(null);
    setAgentName(null);
    setStartDate(null);
    setEndDate(null);
    setMetricsData(null);
  }, []);

  return (
    <div className='!font-sans'>
      {loading && <Loader />}
      <div className='relative'>
        <div className="group fixed right-[5%] top-[10%] z-50 overflow-visible">
            {/* Icon + ripples */}
          <div className="relative w-16 h-16 overflow-visible">
            <span
              className="pointer-events-none absolute inset-0 rounded-full bg-[#EE4B4A]/70 animate-ping"
              style={{ animationDelay: '100ms', animationDuration: '2s' }}
            />
            <span
              className="pointer-events-none absolute inset-0 rounded-full bg-[#EE4B4A]/60 animate-ping"
              style={{ animationDelay: '400ms', animationDuration: '2s' }}
            />
            <span
              className="pointer-events-none absolute inset-0 rounded-full bg-[#EE4B4A]/50 animate-ping"
              style={{ animationDelay: '800ms', animationDuration: '2s' }}
            />
            <img
              src={chatBot}
              onClick={() => setChatOpen(true)}
              alt="Chat Bot Icon"
              className="relative z-10 w-16 h-16 cursor-pointer select-none"
            />
          </div>

          <div
            className="absolute top-1/2 -translate-y-1/2
                        right-[calc(100%-12px)]
                        opacity-0 pointer-events-none
                        transition-opacity duration-150
                        group-hover:opacity-100 group-hover:pointer-events-auto
                        group-focus-within:opacity-100 group-focus-within:pointer-events-auto"
          >
            <div className="w-[260px] min-w-[260px] max-w-[260px]">
              <HelpBubble />
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 right-0 z-50 flex flex-col items-end gap-3 overflow-visible">
        {/* Chat panel (appears above the icon) */}
          {chatOpen && (
            <div
              ref={panelRef}
              className="pointer-events-auto opacity-0 translate-y-2 animate-[fadeInUp_160ms_ease-out_forwards]"
              style={{ transformOrigin: "bottom right" }}
            >
              <ChatBot accountName={accounts || []} onClose={() => setChatOpen(false)} />
            </div>
          )}
        </div>

        <div className="border border-[#E2E2E2] p-6">
          <div className="font-semibold text-[#26203B] mb-2 text-xl leading-none tracking-normal">
            Account & Agent Details
          </div>
          <div className="font-medium text-[#313133] text-sm leading-none tracking-normal">
            Enter the details for Account name and Agents in order to see the details.
          </div>

          <div className='mt-6 flex gap-6'>
            <div className='mt-[5px] flex gap-2 flex-col'>
              <span className='font-medium text-[#111827] text-base leading-none tracking-normal'>
                Date Range <span className='text-[#ef4444]'>*</span>
              </span>
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
                options={accountOptions}
                value={accountName}
                onChange={handleAccountChange}
                placeholder="Select Account Name"
              />
            </div>
            <div>
              <InputSelect
                title="LOB"
                required
                options={lobOptions}
                value={lobName}
                multi={true}
                showSelectAll={true}
                onChange={handleLobChange}
                placeholder="Select LOB"
              />
            </div>
          </div>
          <div className='mt-4 flex gap-6'>
            <InputSelect
              title="Select Channel"
              required
              options={channelOptions}
              value={channelName}
              multi={true}
              showSelectAll={true}
              onChange={handleSelectChannel}
              placeholder="Select Channel"
            />
            <InputSelect
              title="Ninja Name"
              required
              options={agentOptions}
              value={agentName}
              multi={true}
              showSelectAll={true}
              onChange={handleSelectAgent}
              placeholder="Select Ninja Name"
            />
          </div>
          <div className="flex gap-4 justify-end">
            <Button onClick={handleClear} className="btn-secondary-active !px-5 !py-2">Clear</Button>
            <Button onClick={handleApply} className="btn-default-active !px-5 !py-2">Apply</Button>
          </div>
        </div>

        <div className="my-8">
          {metricsData ? (
            <div>
              <div className="border border-[#E2E2E2] p-4">
                <div className="grid gap-4">
                  <ChartPanel
                    title="Complaint Detection and Categorization (Voice of the Customer)"
                    helpText={tooltipTexts.complaint}
                  >
                    {isEmptyObject(metricsData?.complain_detection)
                      ? <NoContent className="!w-full" />
                      : <ComplaintDetection data={metricsData?.complain_detection} />}
                  </ChartPanel>

                  <DashboardLayout
                    left={
                      <ChartPanel
                        title="Call Escalation Trends"
                        helpText={tooltipTexts.escalation}
                      >
                        <CallEscalationTrends metricsData={metricsData} title="" />
                      </ChartPanel>
                    }
                    centerBottom={
                      <ChartPanel
                        title="Customer Verbatim Trend"
                        helpText={tooltipTexts.verbatim}
                      >
                        <CustomerVerbatimTrend data={metricsData?.customer_verbatim_trend} title="" />
                      </ChartPanel>
                    }
                    centerTop={
                      <ChartPanel
                        title="Communication Style Impact"
                        helpText={tooltipTexts.commStyle}
                      >
                        <CommunicationStyleImpact data={metricsData?.communication_style_impact} title="" />
                      </ChartPanel>
                    }
                    right={
                      <ChartPanel
                        title="Top Markdowns"
                        helpText={tooltipTexts.markdowns}
                      >
                        <TopMarkdowns metricsData={metricsData} title="" />
                      </ChartPanel>
                    }
                    bottom={null}
                  />
                </div>
              </div>
            </div>
          ) : <NoContent className='!w-full' />}
        </div>
        {toast && <Toast {...toast} />}
      </div>
    </div>
  );
};

export default ConversationalAnalytics;
