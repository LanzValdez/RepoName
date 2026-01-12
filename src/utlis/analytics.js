const DEFAULT_APP_ID = 'ninja-ai-qa';
const API_ENDPOINT = "https://api-ninja-ga-events.dev.supportninja.com/send-event";
const CID_CACHE_KEY = 'analyticsClientId';

function readGaClientIdFromCookie() {
    // Check for any _ga cookie first
    const allGaCookies = document.cookie.match(/_ga[^;]*/g);
    const m = document.cookie.match(/(?:^|;\s*)_ga=GA\d+\.\d+\.(\d+)\.(\d+)/);
    if (!m) {
        return null;
    }
    return `${m[1]}.${m[2]}`;
}

function checkGoogleAnalytics() {
    return typeof window.gtag !== 'undefined' || typeof window.ga !== 'undefined';
}


async function waitForGaClientId(timeoutMs = 10000, intervalMs = 500) {

    // First check if GA is loaded
    if (!checkGoogleAnalytics()) {
        console.error('Google Analytics is not loaded! Add GA script to your HTML.');
        return null;
    }

    const deadline = Date.now() + timeoutMs;
    let attempts = 0;

    while (Date.now() < deadline) {
        attempts++;

        const cid = readGaClientIdFromCookie();
        if (cid) {
            return cid;
        }

        await new Promise(r => setTimeout(r, intervalMs));
    }

    return null;
}


export async function getUserPseudoId() {

    const cid = await waitForGaClientId();
    if (cid) {
        localStorage.setItem(CID_CACHE_KEY, cid);
    } else {
        console.warn('[analytics] _ga client id not found after waiting.');
    }
    return cid;
}


const EVENT_PAYLOADS = {
    login: ({ email, clientId }) => ({
        app_id: DEFAULT_APP_ID,
        client_id: clientId,
        event_name: 'login',
        email: email,
        event_params: {},
    }),
    filterAccountName: ({ email, clientId }) => ({
        app_id: DEFAULT_APP_ID,
        client_id: clientId,
        event_name: 'filter',
        email: email,
        page: page || 'unknown',
        event_params: { filter: 'accountName' },
    }),
    filterAgents: ({ email, clientId }) => ({
        app_id: DEFAULT_APP_ID,
        client_id: clientId,
        event_name: 'filter',
        email: email,
        event_params: { filter: 'agents' },
    }),
    filterMetrics: ({ email, clientId, page, selectedAccount, selectedAgents, agentCount, startDate, endDate }) => ({
        app_id: DEFAULT_APP_ID,
        client_id: clientId,
        event_name: 'filterMetrics',
        email: email,
        event_params: {
            page: page || 'unknown',
            selectedAccount,
            agentCount: agentCount || 0,
            startDate,
            endDate,
            clientId
        },
    }),
    filterTicketId: ({ email, clientId, page, startDate, endDate, selectedAccount, selectedAgent, ticketId, source }) => ({
        app_id: DEFAULT_APP_ID,
        client_id: clientId,
        event_name: 'filterTicketId',
        email: email,
        event_params: {
            page: page || 'unknown',
            startDate,
            endDate,
            selectedAccount,
            selectedAgent,
            ticketId,
            clientId,
            source
        },
    }),
};


export const trackPageView = ({ path }) => {
    if (typeof window === 'undefined' || !window.gtag) return;

    window.gtag('event', 'page_view', {
        page_path: path,
    });
};

export const sendEventToApi = async (payloadKey, context = {}) => {
    const buildPayload = EVENT_PAYLOADS[payloadKey];
    if (!buildPayload) {
        console.warn(`Unknown analytics event: ${payloadKey}`);
        return;
    }

    // Get the GA Client ID automatically
    const clientId = await getUserPseudoId();


    // Build payload with auto-extracted clientId
    const payload = buildPayload({
        ...context,
        clientId: clientId || context.clientId // Use extracted ID or fallback to provided one
    });

    const headers = { "Content-Type": "application/json" };
    const token = localStorage.getItem("jwt");
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    try {
        const response = await fetch(API_ENDPOINT, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const text = await response.text();
        }
    } catch (error) {
        console.warn("Custom analytics API call error:", error);
    }
};