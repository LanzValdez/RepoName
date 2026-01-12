import axios from "axios";
import { jwtDecode } from "jwt-decode";

const API_BASE_URL = "https://api-aiqa-backend.dev.supportninja.com"

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" }
});

function isTokenExpired(token) {
    try {
        const { exp } = jwtDecode(token);
        if (!exp) return true;
        const now = Math.floor(Date.now() / 1000);
        return exp < now;
    } catch (e) {
        return true;
    }
}

function redirectToLogin() {
    localStorage.clear();
    window.location.href = `/`;
}

/* – single shared refresh promise – */
let refreshPromise = null;

async function getFreshAccessToken() {
    if (refreshPromise) return refreshPromise;

    const refreshTokenId = localStorage.getItem("refreshTokenId");

    refreshPromise = axios
        .post(
            "https://api-rbac.dev.supportninja.com/rbac/login",
            {
                applicationId: "digital_qa",
                refreshTokenId,
                requestType: "refresh",
            },
            {
                headers: { "Content-Type": "application/json" },
                withCredentials: true,
            }
        )
        .then(({ data }) => {
            localStorage.setItem("jwt", data.accessToken);
            localStorage.setItem("refreshTokenId", data.refreshTokenId);
            return data.accessToken;
        })
        .catch((err) => {
            console.error("Token refresh failed:", err);
            redirectToLogin();          // ⬅️ push to /
            throw err;
        })
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
}

/* ▌REQUEST INTERCEPTOR ▐ */
api.interceptors.request.use(async (config) => {
    let token = localStorage.getItem("jwt");

    if (token && isTokenExpired(token)) {
        token = await getFreshAccessToken(); // may redirect inside on failure
    }

    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    async (response) => {
        if (response.status === 401) {
            try {
                const token = await getFreshAccessToken(); // handle redirect inside if needed
                const originalRequest = response.config;
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest); // Retry the original request
            } catch (err) {
                redirectToLogin(); // Fallback: logout user
                return Promise.reject(err);
            }
        }

        return response;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
export { isTokenExpired, getFreshAccessToken };