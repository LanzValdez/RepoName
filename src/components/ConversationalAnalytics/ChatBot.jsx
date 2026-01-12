import { useEffect, useRef, useState, useCallback, useMemo, memo } from "react";
import ChatBotIcon from "../../assets/icons/chat-bot-round.svg";
import api from "../../api/axios";
import { Button, InputSelect, Loader } from "@supportninja/ui-components";
//Feedback related imports
import thumbsUp from "../../assets/icons/thumbs-up.svg";
import thumbsDown from "../../assets/icons/thumbs-down.svg";
import thumbsUpFilled from "../../assets/icons/thumbs-up-filled.svg";
import thumbsDownFilled from "../../assets/icons/thumbs-down-filled.svg";
import { submitFeedback } from "../common/api";
import { formatBotResponse, parseInlineFormatting } from "../../utils/textFormatter";

/* ---------- Date helpers for suggestions ---------- */
function getPrevMonth(date = new Date(), locale = 'en-US', monthFormat = 'long') {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  const name = new Intl.DateTimeFormat(locale, { month: monthFormat, timeZone: 'UTC' }).format(d);
  return { name, monthIndex: d.getUTCMonth(), year: d.getUTCFullYear() };
}

function getPrevQuarter(date = new Date()) {
  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();
  const currentQ = Math.floor(month / 3) + 1;
  const prevQ = currentQ === 1 ? 4 : currentQ - 1;
  const prevYear = currentQ === 1 ? year - 1 : year;
  const startMonth = (prevQ - 1) * 3; // 0,3,6,9
  const start = new Date(Date.UTC(prevYear, startMonth, 1));
  const end = new Date(Date.UTC(prevYear, startMonth + 3, 0)); // last day of the quarter
  return {
    q: prevQ,
    year: prevYear,
    label: `Q${prevQ}`,
    labelWithYear: `Q${prevQ} ${prevYear}`,
    range: { start, end },
  };
}

function getCurrentQuarter(date = new Date()) {
  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();
  const q = Math.floor(month / 3) + 1;
  const startMonth = (q - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 0));
  return {
    q,
    year,
    label: `Q${q}`,
    labelWithYear: `Q${q} ${year}`,
    range: { start, end },
  };
}

function getQuarterForSuggestions(date = new Date(), quarterMode = 'current') {
  // quarterMode: 'current' | 'previous'
  return quarterMode === 'previous' ? getPrevQuarter(date) : getCurrentQuarter(date);
}


export function buildSuggestions({
  date = new Date(),
  locale = 'en-US',
  monthFormat = 'long',
  includeQuarterYear = false,
  quarterMode = 'current', // NEW default: current quarter
} = {}) {
  const { name: prevMonthName } = getPrevMonth(date, locale, monthFormat);

  const quarter = getQuarterForSuggestions(date, quarterMode);
  const qLabel = includeQuarterYear ? quarter.labelWithYear : quarter.label;

  return [
    `What was the average Quality Score for the team in ${prevMonthName}?`,
    `Summarize team performance for ${qLabel}.`,
    'Which agents are below the 90% passing score for the last quarter?',
    'What was the primary customer issue for the team in the last 7 days?',
  ];
}

/* ---------- UI pieces ---------- */
const BotMessageCard = memo(function BotMessageCard({
  name = "Jin",
  time = "",
  text = "",
  messageId = null,
  question = "",
  metadata = null,
  onFeedback = () => { }
}) {
  const [feedbackGiven, setFeedbackGiven] = useState(null); // 'up' | 'down' | null
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [textSize, setTextSize] = useState('medium'); // 'small' | 'medium' | 'large'

  const formattedContent = useMemo(() => formatBotResponse(text), [text]);
  const isLongResponse = text.length > 500;

  const textSizeClasses = {
    small: 'text-[12px] sm:text-[13px] md:text-[14px] leading-relaxed',
    medium: 'text-[13px] sm:text-[14px] md:text-[15px] leading-relaxed sm:leading-7',
    large: 'text-[14px] sm:text-[15px] md:text-[16px] leading-relaxed sm:leading-8'
  };

  const handleThumbsUp = async () => {
    if (feedbackGiven || loading) return;
    setLoading(true);
    setFeedbackGiven('up');
    await onFeedback(messageId, 5, 'thumbs_up', question, text, metadata);
    setLoading(false);
  };

  const handleThumbsDown = async () => {
    if (feedbackGiven || loading) return;
    setLoading(true);
    setFeedbackGiven('down');
    await onFeedback(messageId, 1, 'thumbs_down', question, text, metadata);
    setLoading(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="rounded-[16px] p-[1.5px] bg-[linear-gradient(230deg,rgba(238,75,74,0.55)_0%,rgba(238,75,74,0.25)_45%,rgba(238,75,74,0)_100%)] shadow-[0_1.364px_2.727px_0_rgba(25,33,61,0.08)]">
      <div className="rounded-[15px] bg-white p-4 sm:p-5 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center">
              <img src={ChatBotIcon} alt="bot" className="h-8 w-8" />
            </span>
            <span className="text-[14px] md:text-[15px] font-semibold text-slate-800">{name}</span>
            <span className="h-4 w-px bg-slate-200" />
            <time className="text-[12px] md:text-[13px] font-medium text-slate-400">{time}</time>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Text size controls */}
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={() => setTextSize('small')}
                className={`text-[11px] font-medium px-2 py-1 rounded transition-colors ${
                  textSize === 'small' 
                    ? 'bg-slate-200 text-slate-800' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Small text"
              >
                A
              </button>
              <button
                onClick={() => setTextSize('medium')}
                className={`text-[13px] font-medium px-2 py-1 rounded transition-colors ${
                  textSize === 'medium' 
                    ? 'bg-slate-200 text-slate-800' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Medium text"
              >
                A
              </button>
              <button
                onClick={() => setTextSize('large')}
                className={`text-[15px] font-medium px-2 py-1 rounded transition-colors ${
                  textSize === 'large' 
                    ? 'bg-slate-200 text-slate-800' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Large text"
              >
                A
              </button>
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              title="Copy response"
            >
              {copied ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`mt-4 ${isLongResponse && !isExpanded ? 'max-h-[300px] overflow-hidden relative' : ''}`}>
          <div className={`space-y-3 max-w-full sm:max-w-[calc(100vw-200px)] md:max-w-[640px] lg:max-w-[760px] ${textSizeClasses[textSize]}`}>
            {formattedContent.map((item, idx) => {
              if (item.type === 'list-item') {
                return (
                  <div key={idx} className="flex gap-3 items-start">
                    <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#EE4B4A]/10 text-[#EE4B4A] text-xs font-semibold mt-0.5">
                      {item.number}
                    </span>
                    <p 
                      className="flex-1 text-slate-700"
                      dangerouslySetInnerHTML={{ __html: parseInlineFormatting(item.content) }}
                    />
                  </div>
                );
              } else {
                return (
                  <p
                    key={idx}
                    className={`text-slate-600 ${item.emphasis ? 'font-medium text-slate-800' : ''}`}
                    dangerouslySetInnerHTML={{ __html: parseInlineFormatting(item.content) }}
                  />
                );
              }
            })}
          </div>
          
          {/* Gradient fade for collapsed long responses */}
          {isLongResponse && !isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          )}
        </div>

        {/* Expand/Collapse button */}
        {isLongResponse && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-[13px] font-medium text-[#EE4B4A] hover:text-[#e43e3d] transition-colors flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                Show less
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                Show more
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        )}

        {/* Feedback buttons */}
        {messageId && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
            <span className="text-[11px] text-slate-500">Was this helpful?</span>
            <button
              onClick={handleThumbsUp}
              disabled={loading || feedbackGiven !== null}
              className="transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Thumbs Up"
            >
              <img
                src={feedbackGiven === 'up' ? thumbsUpFilled : thumbsUp}
                alt="Thumbs Up"
                width={20}
                height={20}
              />
            </button>
            <button
              onClick={handleThumbsDown}
              disabled={loading || feedbackGiven !== null}
              className="transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Thumbs Down"
            >
              <img
                src={feedbackGiven === 'down' ? thumbsDownFilled : thumbsDown}
                alt="Thumbs Down"
                width={20}
                height={20}
              />
            </button>
            {feedbackGiven && (
              <span className="text-[11px] text-green-600 ml-2">Thank you for your feedback!</span>
            )}
            {copied && (
              <span className="text-[11px] text-blue-600 ml-auto">Copied!</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

const TypingBubble = memo(function TypingBubble({ assistant = "Jin" }) {
  return (
    <div className="ml-10">
      <div className="rounded-[16px] p-[1.5px] bg-[linear-gradient(230deg,rgba(238,75,74,0.55)_0%,rgba(238,75,74,0.25)_45%,rgba(238,75,74,0)_100%)] shadow-[0_1.364px_2.727px_0_rgba(25,33,61,0.08)]">
        <div className="rounded-[15px] bg-white p-4 sm:p-5 md:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center">
              <img src={ChatBotIcon} alt="bot" className="h-8 w-8" />
            </span>
            <span className="text-[14px] md:text-[15px] font-semibold text-slate-800">{assistant}</span>
            <span className="h-4 w-px bg-slate-200" />
            <span className="text-[12px] md:text-[13px] font-medium text-slate-400">Typing…</span>
          </div>
          <div className="mt-4">
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const BotInputCard = memo(function BotInputCard({ children }) {
  return (
    <div className="rounded-[16px] p-[1.5px] bg-[linear-gradient(230deg,rgba(238,75,74,0.55)_0%,rgba(238,75,74,0.25)_45%,rgba(238,75,74,0)_100%)] shadow-[0_1.364px_2.727px_0_rgba(25,33,61,0.08)]">
      <div className="rounded-[15px] bg-white p-4 sm:p-5 md:p-6">
        {children}
      </div>
    </div>
  );
});

const SuggestionBar = memo(function SuggestionBar({
  items = [],
  onPick = () => { },
  collapsed = false,
  onToggle = () => { },
}) {
  return (
    <div className="m-2 mb-0 select-none">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-600">Suggested questions</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#EE4B4A]/70" />
        </div>
        <button type="button" onClick={onToggle} className="text-[11px] text-indigo-600 hover:underline">
          {collapsed ? "Show" : "Hide"}
        </button>
      </div>

      {!collapsed && (
        <div className="m-2">
          <div className="grid grid-cols-2 gap-2 px-1">
            {items.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onPick(s)}
                className="w-full rounded-md px-2 py-1 text-[11px] font-medium
                  bg-white text-[#EE4B4A] ring-1 ring-[#EE4B4A]/40
                  hover:bg-[#EE4B4A]/15 transition
                  text-left whitespace-normal break-words"
                title={s}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

/* ---------- ChatBot ---------- */
export default function ChatBot({
  onClose = () => { },
  onSend = () => { },           // if this returns Promise<string>, we stream that text
  onSuggestion = () => { },
  onPrechatComplete = () => { },
  name = "You",
  assistant = "Jin",
  accountName = [],
  charDelayMs = 20,           // typewriter speed (ms per char)
}) {
  const [stage, setStage] = useState("welcome");
  const [started, setStarted] = useState(false);

  const [messages, setMessages] = useState([]); // {id?, role, text, time}
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Account data and selection
  const [accounts, setAccounts] = useState(accountName || []);
  const [accountId, setAccountId] = useState(null);
  const [tempAccountId, setTempAccountId] = useState(null);

  // Editing account inline
  const [isEditingAccount, setIsEditingAccount] = useState(false);

  // Fetch & UI state (accounts, etc.)
  const [loading, setLoading] = useState(false);

  // Typing/loading states for bot replies
  const [botLoading, setBotLoading] = useState(false);  // waiting for network/response
  const [isStreaming, setIsStreaming] = useState(false); // printing characters
  const streamTimerRef = useRef(null);

  // Panel visibility
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Queue a suggestion clicked before prechat
  const [pendingQuestion, setPendingQuestion] = useState(null);

  // Refs and helpers
  const messagesRef = useRef(null);
  const rafRef = useRef(0);
  const accountIdRef = useRef(null);

  const handleMessageFeedback = useCallback(async (messageId, rating, feedbackType, question, response, apiMetadata) => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      const accountIdValue = accountIdRef.current;
      const feedbackMetadata = {
        source: "jinsbot",
        question: question || "",
        response: response || ""
      };

      // Add metadata fields if they exist
      if (apiMetadata.metadata) {
        if (apiMetadata.metadata.level) {
          feedbackMetadata.level = apiMetadata.metadata.level;
        }
        if (apiMetadata.metadata.crm) {
          feedbackMetadata.crm = apiMetadata.metadata.crm;
        }
        if (apiMetadata.metadata.subdomain) {
          feedbackMetadata.subdomain = apiMetadata.metadata.subdomain;
        }
        if (apiMetadata.metadata.agent_name) {
          feedbackMetadata.agent_name = apiMetadata.metadata.agent_name;
        }
        if (apiMetadata.metadata.intent) {
          feedbackMetadata.intent = apiMetadata.metadata.intent;
        }
      }
      feedbackMetadata.accountIdValue = accountIdValue;

      const feedbackData = {
        tool: "aiqa",
        key: messageId,
        rating: rating,
        feedback_type: "jinsbot_feedback",
        user_email: userEmail,
        account_id: accountIdValue,
        feedback: rating,
        metadata:  feedbackMetadata,
        timestamp: new Date().toISOString()
      };

      await submitFeedback(feedbackData);
      console.log('Feedback submitted successfully:', feedbackData);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    accountIdRef.current = accountId;
  }, [accountId]);

  const timeNow = useCallback(
    () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    []
  );

  const suggestions = useMemo(() => buildSuggestions({ locale: 'en-US', monthFormat: 'long' }), []);

  const pushUser = useCallback(
    (text) => setMessages((m) => [...m, { role: "user", text, time: timeNow() }]),
    [timeNow]
  );

  // Keep message list scrolled to bottom
  const scrollToBottom = useCallback(() => {
    const el = messagesRef.current;
    if (!el) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth'
      });
    });
  }, []);
  useEffect(() => {
    scrollToBottom();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [messages, stage, isEditingAccount, botLoading, isStreaming, scrollToBottom]);

  // Clear streaming interval on unmount
  useEffect(() => {
    return () => {
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    };
  }, []);

  // Account helpers
  const accountNameMap = useMemo(() => {
    const m = new Map();
    for (const a of accounts) m.set(a.account_id, a.account_name);
    return m;
  }, [accounts]);
  const getAccountName = useCallback(
    (id) => accountNameMap.get(id) || String(id ?? ""),
    [accountNameMap]
  );
  const accountOptions = useMemo(
    () =>
      accounts?.map((item) => ({
        label: item.account_name,
        value: item.account_id,
      })) ?? [],
    [accounts]
  );
  const normalizeAccountValue = useCallback((val) => {
    if (Array.isArray(val)) return val[0] ?? null;
    if (val && typeof val === "object" && "account_id" in val) return val.account_id;
    return val ?? null;
  }, []);
  const onAccountChange = useCallback(
    (val) => setTempAccountId(normalizeAccountValue(val)),
    [normalizeAccountValue]
  );

  // Start prechat
  const startPrechat = useCallback(() => {
    if (stage !== "welcome") return;
    setStarted(true);
    setStage("prechat");
  }, [stage]);

  // Edit account
  const openEditAccount = useCallback(() => {
    setTempAccountId(accountId);
    setIsEditingAccount(true);
  }, [accountId]);
  const closeEditAccount = useCallback(() => {
    setIsEditingAccount(false);
  }, []);
  const confirmAccountEdit = useCallback(() => {
    if (!tempAccountId) return;
    setAccountId(tempAccountId);
    try { localStorage.setItem("selectedAccount", tempAccountId); } catch { }
    const nowUser = timeNow();
    const nowBot = timeNow();
    setMessages((m) => [
      ...m,
      { role: "user", text: `Updated account: ${getAccountName(tempAccountId)}`, time: nowUser },
      { role: "bot", text: "Account updated.", time: nowBot }
    ]);
    setIsEditingAccount(false);
    onPrechatComplete({ accountId: tempAccountId });
  }, [tempAccountId, getAccountName, onPrechatComplete, timeNow]);

  /* IMPORTANT: define streamBotText BEFORE any callbacks that depend on it */
  const streamBotText = useCallback((fullText, speed = charDelayMs, userQuestion = "", apiMetadata = null) => {
    if (!fullText) return;
    setIsStreaming(true);
    const id = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = timeNow();

    // push an empty bot message
    setMessages((m) => [...m, { id, role: "bot", text: "", time: now, question: userQuestion, metadata: apiMetadata }]);

    // clear any previous interval
    if (streamTimerRef.current) clearInterval(streamTimerRef.current);

    let i = 0;
    const len = fullText.length;

    streamTimerRef.current = setInterval(() => {
      i += 1;
      const slice = fullText.slice(0, i);

      // Update last message efficiently
      setMessages((m) => {
        const lastIdx = m.length - 1;
        if (lastIdx >= 0 && (m[lastIdx].id ?? null) === id) {
          const copy = m.slice();
          copy[lastIdx] = { ...copy[lastIdx], text: slice };
          return copy;
        }
        return m.map((msg) => (msg.id === id ? { ...msg, text: slice } : msg));
      });

      if (i >= len) {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
        setIsStreaming(false);
      }
    }, Math.max(10, speed));
  }, [charDelayMs, timeNow]);

  // Fetch a bot reply (prefers onSend Promise<string>, else call your API)
  const fetchReply = useCallback(
    async (userText) => {
      try {
        const maybe = onSend?.(userText);
        if (maybe && typeof maybe.then === "function") {
          const result = await maybe;
          if (typeof result === "string" && result.trim()) return result;
          if (result && result.text) return String(result.text);
        }
      } catch {
        // fall through to API call
      }

      const idToUse = accountIdRef.current;
      if (!idToUse) {
        return {
          response: "Please select an account before sending a question.",
          rawData: null
        };
      }

      try {
        const { data } = await api.post("/qa/conversations", {
          account_id: idToUse,
          question: userText,
        });

        const answer = data?.response || "";

        return {
          response: data?.response || "I couldn't find an answer.",
          rawData: data  // Contains: account_id, question, response, intent, metadata
        };
      } catch (err) {
        const status = err && err.response && err.response.status;
        const serverMsg = err && err.response && err.response.data && err.response.data.message;

        if (status === 401 || status === 403) {
          return {
            response: "You're not authorized to access this resource.",
            rawData: null
          };
        }
        return {
          response: serverMsg
            ? `Error: ${serverMsg}`
            : "Sorry, something went wrong while fetching the answer.",
          rawData: null
        };
      }
    },
    [onSend]
  );

  // Send immediately (used after prechat if a suggestion was clicked earlier)
  const sendQuestionImmediately = useCallback(async (q) => {
    if (!q) return;
    setMessages((m) => [...m, { role: "user", text: q, time: timeNow() }]);
    onSuggestion(q);

    setBotLoading(true);
    try {
      const result = await fetchReply(q);
      setBotLoading(false);
      streamBotText(result.response, charDelayMs, q, result.rawData);
    } catch {
      setBotLoading(false);
      streamBotText("Sorry, something went wrong.", charDelayMs, q, null);
    }
  }, [timeNow, onSuggestion, fetchReply, streamBotText, charDelayMs]);

  // Confirm account (now safe to auto-send queued suggestion)
  const confirmAccount = useCallback(() => {
    if (!tempAccountId) return;
    setAccountId(tempAccountId);
    accountIdRef.current = tempAccountId;
    try { localStorage.setItem("selectedAccount", tempAccountId); } catch { }

    const nowUser = timeNow();
    const nowBot = timeNow();
    const queued = pendingQuestion;

    setMessages((m) => [
      ...m,
      { role: "user", text: `Account: ${getAccountName(tempAccountId)}`, time: nowUser },
      { role: "bot", text: "Great! You’re all set. How can I help?", time: nowBot }
    ]);

    setStage("chat");
    onPrechatComplete({ accountId: tempAccountId });

    if (queued) {
      setPendingQuestion(null);
      setTimeout(() => sendQuestionImmediately(queued), 0);
    }
  }, [tempAccountId, getAccountName, onPrechatComplete, timeNow, pendingQuestion, sendQuestionImmediately]);

  // Chat actions
  const handleSend = useCallback(async () => {
    if (stage !== "chat") {
      if (stage === "welcome") startPrechat();
      return;
    }
    const text = input.trim();
    if (!text || botLoading || isStreaming) return;

    pushUser(text);
    setInput("");

    setBotLoading(true);
    try {
      const result = await fetchReply(text);
      setBotLoading(false);
      streamBotText(result.response, charDelayMs, text, result.rawData);
    } catch {
      setBotLoading(false);
      streamBotText("Sorry, something went wrong.", charDelayMs, text, null);
    }
  }, [stage, input, pushUser, fetchReply, streamBotText, startPrechat, botLoading, isStreaming, charDelayMs]);

  const handleSuggestion = useCallback(async (s) => {
    if (stage !== "chat") {
      setPendingQuestion(s);
      startPrechat();
      return;
    }
    if (botLoading || isStreaming) return;

    setMessages((m) => [...m, { role: "user", text: s, time: timeNow() }]);
    onSuggestion(s);

    setBotLoading(true);
    try {
      const result = await fetchReply(s);
      setBotLoading(false);
      streamBotText(result.response, charDelayMs, s, result.rawData);
    } catch {
      setBotLoading(false);
      streamBotText("Sorry, something went wrong.", charDelayMs, s, null);
    }
  }, [stage, startPrechat, botLoading, isStreaming, timeNow, onSuggestion, fetchReply, streamBotText, charDelayMs]);

  // Close with animation
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  }, [isClosing, onClose]);

  const panelAnim = useMemo(
    () =>
      `transform-gpu transition-[opacity,transform] duration-300 ease-out ` +
      `motion-reduce:transition-none motion-reduce:transform-none ` +
      (isVisible && !isClosing
        ? `opacity-100 translate-y-0 scale-100`
        : `opacity-0 translate-y-3 scale-95`),
    [isVisible, isClosing]
  );

  /* ---- Render helpers (confirmAccount is defined above, so deps are safe) ---- */
  const renderPrechatInput = useCallback(() => {
    if (stage !== "prechat") return null;
    return (
      <BotInputCard>
        <div className="text-[14px] md:text-[15px] font-medium text-slate-700 mb-3">
          Select an account
        </div>
        <InputSelect
          title="Account Name"
          required
          options={accountOptions}
          value={tempAccountId}
          onChange={onAccountChange}
          placeholder={loading ? "Loading accounts..." : "Select Account Name"}
          disabled={loading}
        />
        <div className="mt-3 flex justify-end">
          <Button
            className={!tempAccountId ? "btn-default-disabled" : "btn-default-active"}
            onClick={confirmAccount}
            disabled={!tempAccountId}
          >
            Confirm
          </Button>
        </div>
      </BotInputCard>
    );
  }, [stage, accountOptions, tempAccountId, onAccountChange, loading, confirmAccount]);

  const renderEditAccount = useCallback(() => {
    if (!isEditingAccount) return null;
    return (
      <BotInputCard>
        <div className="text-[14px] md:text-[15px] font-medium text-slate-700 mb-3">
          Update account
        </div>
        <InputSelect
          title="Account Name"
          required
          options={accountOptions}
          value={tempAccountId ?? accountId}
          onChange={onAccountChange}
          placeholder="Select Account Name"
          disabled={loading}
        />
        <div className="mt-3 flex justify-end gap-3">
          <Button
            className={"btn-secondary-active !px-5 !py-2"}
            onClick={closeEditAccount}
          >
            Cancel
          </Button>
          <Button
            className={!tempAccountId ? "btn-default-disabled !px-5 !py-2" : "btn-default-active !px-5 !py-2"}
            onClick={confirmAccountEdit}
            disabled={!tempAccountId}
          >
            Confirm
          </Button>
        </div>
      </BotInputCard>
    );
  }, [isEditingAccount, accountOptions, tempAccountId, accountId, onAccountChange, loading, closeEditAccount, confirmAccountEdit]);

  return (
    <div
      className="fixed !font-sans right-4 bottom-0  sm:bottom-4 sm:right-6 z-50"
      role="dialog"
      aria-modal="true"
    >
      {/* Panel wrapper with enter/exit animation */}
      <div
        className={
          `rounded-[28px] bg-gradient-to-br from-rose-300/70 via-rose-300/25 to-transparent p-[2px] ` +
          `shadow-[0_24px_60px_-16px_rgba(16,24,40,0.35)] ` +
          panelAnim
        }
      >
        {loading && <Loader />}
        <section
          className="
            relative
            flex flex-col
            w-[92vw]
            sm:w-[240px]
            md:w-[400px]
            lg:w-[520px]
            xl:w-[620px]
            2xl:w-[900px]
            rounded-[26px]
            bg-gradient-to-tr from-rose-50 to-white
            p-5 sm:p-6 md:p-8
            ring-1 ring-rose-200
            overflow-y-scroll
            chat-scroll
          "
          style={{
            maxHeight: "min(96dvh, 720px)",            // responsive to mobile UI chrome and keyboard
            WebkitOverflowScrolling: "touch",
            // minHeight: "96dvh",         // smooth scroll on iOS
            // paddingBottom: "max(0px, env(safe-area-inset-bottom))" // keep content above the home indicator
          }}
        >
          {/* Close */}
          <button
            onClick={handleClose}
            aria-label="Close chat"
            className="absolute right-3.5 top-3.5 grid h-8 w-8 lg:h-10 lg:w-10 place-items-center rounded-full bg-white"
            disabled={isClosing}
            title={isClosing ? "Closing…" : "Close chat"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 18 18" fill="none">
              <path d="M8.73655 1.63867C7.33262 1.63867 5.96023 2.05498 4.79291 2.83496C3.62559 3.61494 2.71578 4.72355 2.17852 6.02061C1.64126 7.31766 1.50069 8.74491 1.77458 10.1219C2.04847 11.4988 2.72452 12.7636 3.71725 13.7563C4.70997 14.7491 5.97478 15.4251 7.35173 15.699C8.72867 15.9729 10.1559 15.8323 11.453 15.2951C12.75 14.7578 13.8586 13.848 14.6386 12.6807C15.4186 11.5134 15.8349 10.141 15.8349 8.73703C15.8329 6.85504 15.0844 5.0507 13.7537 3.71993C12.4229 2.38916 10.6185 1.64066 8.73655 1.63867ZM11.307 10.5348C11.3577 10.5856 11.3979 10.6458 11.4254 10.7121C11.4529 10.7784 11.467 10.8494 11.467 10.9211C11.467 10.9929 11.4529 11.0639 11.4254 11.1302C11.3979 11.1965 11.3577 11.2567 11.307 11.3075C11.2562 11.3582 11.196 11.3984 11.1297 11.4259C11.0634 11.4533 10.9924 11.4675 10.9207 11.4675C10.8489 11.4675 10.7779 11.4533 10.7116 11.4259C10.6453 11.3984 10.5851 11.3582 10.5343 11.3075L8.73655 9.50898L6.93875 11.3075C6.88802 11.3582 6.82779 11.3984 6.76151 11.4259C6.69522 11.4533 6.62418 11.4675 6.55244 11.4675C6.48069 11.4675 6.40965 11.4533 6.34336 11.4259C6.27708 11.3984 6.21685 11.3582 6.16612 11.3075C6.11539 11.2567 6.07515 11.1965 6.04769 11.1302C6.02024 11.0639 6.00611 10.9929 6.00611 10.9211C6.00611 10.8494 6.02024 10.7784 6.04769 10.7121C6.07515 10.6458 6.11539 10.5856 6.16612 10.5348L7.9646 8.73703L6.16612 6.93924C6.06366 6.83678 6.00611 6.69782 6.00611 6.55292C6.00611 6.40803 6.06366 6.26906 6.16612 6.16661C6.26858 6.06415 6.40754 6.00659 6.55244 6.00659C6.69733 6.00659 6.83629 6.06415 6.93875 6.16661L8.73655 7.96509L10.5343 6.16661C10.5851 6.11588 10.6453 6.07563 10.7116 6.04818C10.7779 6.02072 10.8489 6.00659 10.9207 6.00659C10.9924 6.00659 11.0634 6.02072 11.1297 6.04818C11.196 6.07563 11.2562 6.11588 11.307 6.16661C11.3577 6.21734 11.3979 6.27757 11.4254 6.34385C11.4529 6.41013 11.467 6.48118 11.467 6.55292C11.467 6.62467 11.4529 6.69571 11.4254 6.76199C11.3979 6.82828 11.3577 6.88851 11.307 6.93924L9.50849 8.73703L11.307 10.5348Z" fill="#888888" />
            </svg>
          </button>

          {stage === "welcome" ? (
            <>
              {/* Welcome */}
              <div className="flex justify-center">
                <img src={ChatBotIcon} alt="Chat Bot Icon" className="h-12 w-12 lg:h-14 lg:w-14 select-none" />
              </div>

              <h2 className="mt-2 text-center text-2xl sm:text-3xl lg:text-4xl font-medium leading-snug tracking-tight text-indigo-900">
                Hi,
              </h2>
              <h3 className="mt-1 text-center text-xl sm:text-2xl lg:text-3xl font-medium leading-snug tracking-tight text-indigo-900">
                I’m your AI assistant, {assistant}!
              </h3>

              <div className="mt-2 flex items-start gap-3 rounded-[14px] bg-white/85 p-3 ring-1 ring-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 12 12" fill="none">
                  <path d="M6 0a6 6 0 100 12A6 6 0 006 0Zm-.48 3.12c0-.265.215-.48.48-.48s.48.215.48.48v.24a.48.48 0 01-.96 0v-.24ZM6.72 9.36H5.28a.48.48 0 010-.96H5.52V6H5.28a.48.48 0 010-.96H6c.265 0 .48.215.48.48v2.4h.24a.48.48 0 010 .96Z" fill="#1E71D9" />
                </svg>
                <p className="text-[11px] md:text-[12px] text-slate-700">
                  Important: This chatbot is still under improvement. Currently answers questions on performance summaries, metric calculations, customer issues, feedback, sentiment, ticket disposition, and resolution.
                  <br /><br />
                  <span className="font-semibold text-[#EE4B4A]">Limitations:</span> No session history is saved, follow up questions are not yet available. Advanced analysis and manual scores are not available.
                </p>
              </div>

              <p className="mx-auto mt-2 max-w-[760px] text-center text-[12px] sm:text-[13px] md:text-sm leading-6 text-slate-600">
                Welcome! Before we start, I’ll ask one quick question right here in the chat.
              </p>

              <div className="mt-2 flex justify-center">
                <Button className="btn-default-active !px-3 !py-3 !font-sans flex items-center gap-1" onClick={startPrechat}>
                  Let's Begin
                  <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 2C8.41775 2 6.87103 2.46919 5.55544 3.34824C4.23985 4.22729 3.21447 5.47672 2.60897 6.93853C2.00347 8.40034 1.84504 10.0089 2.15372 11.5607C2.4624 13.1126 3.22433 14.538 4.34315 15.6569C5.46197 16.7757 6.88743 17.5376 8.43928 17.8463C9.99113 18.155 11.5997 17.9965 13.0615 17.391C14.5233 16.7855 15.7727 15.7602 16.6518 14.4446C17.5308 13.129 18 11.5822 18 10C17.9978 7.87895 17.1542 5.84542 15.6544 4.34562C14.1546 2.84581 12.121 2.00224 10 2ZM10 16.7692C8.66117 16.7692 7.35241 16.3722 6.23922 15.6284C5.12603 14.8846 4.2584 13.8274 3.74605 12.5905C3.2337 11.3536 3.09965 9.99249 3.36084 8.67939C3.62203 7.36629 4.26674 6.16012 5.21343 5.21343C6.16013 4.26674 7.36629 3.62203 8.67939 3.36084C9.99249 3.09965 11.3536 3.2337 12.5905 3.74605C13.8274 4.25839 14.8846 5.12602 15.6284 6.23922C16.3722 7.35241 16.7692 8.66117 16.7692 10C16.7672 11.7947 16.0534 13.5153 14.7843 14.7843C13.5153 16.0534 11.7947 16.7672 10 16.7692ZM13.5123 9.56461C13.5695 9.62177 13.6149 9.68964 13.6459 9.76434C13.6769 9.83905 13.6928 9.91913 13.6928 10C13.6928 10.0809 13.6769 10.1609 13.6459 10.2357C13.6149 10.3104 13.5695 10.3782 13.5123 10.4354L11.0508 12.8969C10.9353 13.0124 10.7787 13.0773 10.6154 13.0773C10.4521 13.0773 10.2955 13.0124 10.18 12.8969C10.0645 12.7814 9.99966 12.6248 9.99966 12.4615C9.99966 12.2982 10.0645 12.1416 10.18 12.0262L11.5915 10.6154H6.92308C6.75987 10.6154 6.60334 10.5505 6.48794 10.4351C6.37253 10.3197 6.30769 10.1632 6.30769 10C6.30769 9.83679 6.37253 9.68026 6.48794 9.56486C6.60334 9.44945 6.75987 9.38461 6.92308 9.38461H11.5915L10.18 7.97384C10.0645 7.85837 9.99966 7.70176 9.99966 7.53846C9.99966 7.37516 10.0645 7.21855 10.18 7.10308C10.2955 6.9876 10.4521 6.92273 10.6154 6.92273C10.7787 6.92273 10.9353 6.9876 11.0508 7.10308L13.5123 9.56461Z" fill="#fff" />
                  </svg>
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(s)}
                    className="w-full text-center rounded-[8px] border-[0.583px] border-solid border-white bg-white shadow-sm px-3 py-2 md:text-[12px] text-[#130261] ring-1 ring-slate-200 transition hover:bg-rose-50 hover:ring-rose-300"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Composer (disabled) */}
              <div className="rounded-[22px] mt-2 p-[1.5px] bg-[linear-gradient(225deg,rgba(238,75,74,0.45)_0%,rgba(238,75,74,0.25)_35%,rgba(238,75,74,0)_70%)] shadow-[0_8px_24px_-12px_rgba(238,75,74,0.35)]">
                <div className="flex items-center rounded-[20px] bg-white pl-4 pr-2 ring-1 ring-white/60 opacity-60">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Start chat will be enabled after quick setup"
                    className="h-12 md:h-[52px] flex-1 bg-transparent text-[15px] md:text-[16px] text-slate-800 placeholder-slate-400 outline-none"
                    disabled
                  />
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-slate-300 px-4 py-2 md:px-5 md:py-2.5 text-sm md:text-[15px] font-medium text-white cursor-not-allowed"
                    disabled
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="grid h-8 w-12 place-items-center">
                  <img src={ChatBotIcon} alt="bot" className="h-12 w-12" />
                </div>
                <div>
                  <div className="text-lg sm:text-xl lg:text-2xl font-semibold leading-6 text-indigo-900">
                    {assistant}!
                  </div>
                  <div className="text-xs sm:text-[13px] text-slate-500">24/7 AI Chatbot Assistant</div>
                </div>
              </div>

              {/* Preferences + Edit */}
              {stage === "chat" && (
                <div className="mx-2 mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] sm:text-xs font-medium text-slate-600">Preferences:</span>
                  <span className="text-[11px] sm:text-xs px-2 font-medium py-1 ring-1 ring-[#EE4B4A]/50 rounded-full bg-[#EE4B4A]/10 text-slate-700">
                    Account: {accountId ? getAccountName(accountId) : "—"}
                  </span>
                  <button
                    type="button"
                    onClick={openEditAccount}
                    className="ml-auto flex gap-1 text-[11px] sm:text-xs text-indigo-600"
                  >
                    Edit
                  </button>
                </div>
              )}

              <hr className="my-2 border-slate-200/70" />

              {/* Messages */}
              <div ref={messagesRef} className="flex-1 min-h-0 space-y-6 overflow-y-auto pr-1">
                {messages.map((m, idx) =>
                  m.role === "user" ? (
                    <div key={m.id ?? idx} className="flex items-start gap-3">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600">
                        {name?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <div className="mb-1 text-[12px] md:text-[13px] font-semibold text-slate-800">
                          {name} <span className="ml-2 font-normal text-slate-400">{m.time}</span>
                        </div>
                        <p className="max-w-[760px] text-[13px] md:text-[14px] leading-6 text-slate-700">{m.text}</p>
                      </div>
                    </div>
                  ) : (
                    <div key={m.id ?? idx} className="ml-10">
                      <BotMessageCard
                        name={assistant}
                        time={m.time}
                        text={m.text}
                        messageId={m.id}
                        question={m.question || ""}
                        metadata={m.metadata || null}
                        onFeedback={handleMessageFeedback} />
                    </div>
                  )
                )}

                {stage === "chat" && botLoading && !isStreaming && (
                  <TypingBubble assistant={assistant} />
                )}

                {renderPrechatInput()}

                {renderEditAccount()}
              </div>

              {/* Suggestions */}
              {stage === "chat" && (
                <SuggestionBar
                  items={suggestions}
                  onPick={handleSuggestion}
                  collapsed={!showSuggestions || isEditingAccount || input.trim().length > 0}
                  onToggle={() => setShowSuggestions((v) => !v)}
                />
              )}

              {/* Composer */}
              <div className="rounded-[22px] mt-2 mb-2 p-[1.5px] bg-[linear-gradient(225deg,rgba(238,75,74,0.45)_0%,rgba(238,75,74,0.25)_35%,rgba(238,75,74,0)_70%)] shadow-[0_8px_24px_-12px_rgba(238,75,74,0.35)]">
                <div className={`flex items-center rounded-[20px] bg-white pl-4 pr-2 ring-1 ring-white/60 ${(stage !== "chat" || isEditingAccount) ? "opacity-60" : ""}`}>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => stage === "chat" && !isEditingAccount && !botLoading && !isStreaming && e.key === "Enter" && handleSend()}
                    placeholder={stage === "chat" ? (isEditingAccount ? "Finish editing account above…" : "Ask anything you need") : "Finish quick setup above…"}
                    className="h-12 md:h-[52px] flex-1 bg-transparent text-[15px] md:text-[16px] text-slate-800 placeholder-slate-400 outline-none"
                    disabled={stage !== "chat" || isEditingAccount || botLoading || isStreaming || !accountId}
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 md:px-5 md:py-2.5 text-sm md:text-[15px] font-medium text-white ring-1 transition
                      ${stage === "chat" && !isEditingAccount && !botLoading && !isStreaming
                        ? "bg-[#EE4B4A] shadow-[0_6px_18px_-6px_rgba(238,75,74,0.60)] ring-white/30 hover:bg-[#e43e3d]"
                        : "bg-slate-300 cursor-not-allowed"}`}
                    disabled={stage !== "chat" || isEditingAccount || botLoading || isStreaming || !accountId}
                  >
                    Send
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-5 5m5-5l5 5" />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}