// src/auth/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();


export function AuthProvider({ children }) {
    const [token, setToken] = useState(null);

    useEffect(() => {
        const saved = localStorage.getItem("jwt");
        if (saved) setToken(saved);
    }, []);

    const login = (newToken) => {
        localStorage.setItem("jwt", newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem("jwt");
        localStorage.clear();
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

/** Hook for easy access */
export function useAuth() {
    return useContext(AuthContext);
}
