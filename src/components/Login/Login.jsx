import React, { useState } from "react";
import { GoogleLogin, Toast, Loader } from "@supportninja/ui-components";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from 'jwt-decode'
import { useAuth } from "../../auth/AuthContext";
import {sendEventToApi } from "../../utlis/analytics";
// import api from "../../api/axios";

const GOOGLE_CLIENT_ID = '106603981486-qpkulg9imin5t1jl89ab7hjlhci5fani.apps.googleusercontent.com';


export default function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [toast, setToast] = useState(null);
    const { token, login } = useAuth();

    const clearMalformedGaCookie = () => {
        const gaCookie = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/);
        if (gaCookie && gaCookie[1].includes('apps.googleusercontent.com')) {
            document.cookie = '_ga=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            document.cookie = '_ga=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.supportninja.com';
            document.cookie = '_ga=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=supportninja.com';
        }
    };


    React.useEffect(() => {
        if (token) navigate("/dashboard", { replace: true });
    }, [token, navigate]);

    React.useEffect(() => {
        clearMalformedGaCookie();
    }, []);

    const showToast = (msg, opts = {}) => setToast({ message: msg, ...opts });

    const handleLoginSuccess = async (credentialResponse) => {
        setLoading(true)
        setError('')

        const idToken = credentialResponse.credential
        const { email } = jwtDecode(idToken)

        localStorage.setItem('userEmail', email);

        try {
            const response = await fetch('https://api-rbac.dev.supportninja.com/rbac/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    applicationId: 'digital_qa',
                    idToken,
                    requestType: 'login',
                }),
            })

            const result = await response.json()

            let roles = [];
            if (result.accessToken) {
                try {
                    const decoded = jwtDecode(result.accessToken);
                    roles = decoded.roles || [];
                } catch (error) {
                    console.error('Invalid token', error);
                }
            }

            if (roles?.length === 0) {
                setError("You don't have access to this application.")
                showToast("You don't have access to this application.", {
                    type: "error",
                    duration: 9000,
                    position: "bottom-right",
                    onClose: () => setToast(null),
                })
                return;
            }

            if (roles.includes('digital_qa.all.viewer') || roles.includes('digital_qa.all.admin')) {
                localStorage.setItem('jwt', result.accessToken)
                login(result.accessToken);
                localStorage.setItem('refreshTokenId', result.refreshTokenId);
                localStorage.setItem('loginInfo', JSON.stringify(result))
                navigate("/dashboard", { replace: true });
                await sendEventToApi("login", { email });
            } else {
                throw new Error('Access denied.')
            }
        } catch (err) {
            localStorage.clear();
            showToast("Login Failed. Please try again", {
                type: "error",
                duration: 5000,
                position: "bottom-right",
                onClose: () => setToast(null),
            })
            setError('Login failed. Please try again.')
        } finally {
            setLoading(false)
        }
    };

    const handleLoginError = () => {
        setError('Google login failed.')
        showToast("Login Failed. Please try again", {
            type: "error",
            duration: 3000,
            position: "bottom-right",
            onClose: () => setToast(null),
        })
    };

    return (
        <div>
            <div className="flex items-center justify-center flex-col">
                <GoogleLogin
                    clientId={GOOGLE_CLIENT_ID}
                    title="NinjaAI QA"
                    handleLoginSuccess={handleLoginSuccess}
                    handleLoginError={handleLoginError}
                    useOneTap={false}
                />
                {toast && <Toast {...toast} />}
                {loading && <Loader />}
            </div>
        </div>
    );
}
