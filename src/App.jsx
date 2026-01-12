// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import AppLayout from "./AppLayout";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Evaluation from "./components/Evaluation";
import QualityForm from "./components/QualityForm";
import RequireAuth from "./RequireAuth";
import ConversationalAnalytics from "./components/ConversationalAnalytics";
import Insights from "./components/Insights";
const GOOGLE_CLIENT_ID = '106603981486-qpkulg9imin5t1jl89ab7hjlhci5fani.apps.googleusercontent.com';

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route
              index
              element={<Navigate to="/dashboard" replace />}
            />
            <Route path="dashboard" element={<Dashboard />} />

            <Route
              path="/conversation-analytics"
              element={
                <RequireAuth>
                  <ConversationalAnalytics />
                </RequireAuth>
              }
            />

            <Route
              path="/quality-form"
              element={
                <RequireAuth>
                  <QualityForm />
                </RequireAuth>
              }
            />

            <Route
              path="/insights"
              element={
                <RequireAuth>
                  <Insights />
                </RequireAuth>
              }
            />

          </Route>

          <Route
            path="*"
            element={
              <Navigate
                to={localStorage.getItem("jwt") ? "/dashboard" : "/login"}
                replace
              />
            }
          />
        </Routes>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
