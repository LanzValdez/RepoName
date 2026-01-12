import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from '@supportninja/ui-components';
import { isTokenExpired, getFreshAccessToken } from './api/axios';

const RequireAuth = ({ children }) => {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    const logout = async () => {
        try {
            const refreshTokenId = localStorage.getItem("refreshTokenId");
            const idToken = localStorage.getItem("jwt");

            if (refreshTokenId && idToken) {
                await fetch("https://api-rbac.dev.supportninja.com/rbac/logout", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        applicationId: "digital_qa",
                        requestType: "logout",
                        refreshTokenId,
                    }),
                    credentials: "include",
                });
            }
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            localStorage.clear();
            navigate("/login", { replace: true });
        } ''
    };

    useEffect(() => {
        let mounted = true;

        (async () => {
            let token = localStorage.getItem("jwt");

            if (!token) {
                if (mounted) setIsAuthenticated(false);
                return;
            }

            if (isTokenExpired(token)) {
                try {
                    token = await getFreshAccessToken();
                } catch (err) {
                    console.error("Token refresh failed");
                    if (mounted) setIsAuthenticated(false);
                    return;
                }
            }

            if (mounted) setIsAuthenticated(true);
        })();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (isAuthenticated === false) {
            logout(); // triggers only once after state update
        }
    }, [isAuthenticated]);

    if (isAuthenticated === null) return <Loader />;

    if (isAuthenticated) return children;

    return null;
};

export default RequireAuth;
