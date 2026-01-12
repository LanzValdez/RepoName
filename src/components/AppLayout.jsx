// src/AppLayout.jsx
import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Header from "./components/Header";
import NavigationMenu from "./components/NavigationMenu";
import { Loader } from "@supportninja/ui-components";

export default function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Check if mobile view
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // Set initial states based on screen size
            if (mobile) {
                setSidebarOpen(false); // Closed by default on mobile
            } else {
                setSidebarOpen(true); // Open by default on desktop
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="h-screen flex flex-col font-tenon">
            {loading && <Loader />}
            <header className="h-[60px] flex-shrink-0 flex items-center justify-between bg-white border-b">
                {/* Mobile menu button */}
                <button
                    className="md:hidden p-2 hover:bg-gray-100 rounded"
                    onClick={() => setSidebarOpen(true)}
                >
                    <Menu size={24} />
                </button>
                <Header />
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Mobile overlay */}
                <div
                    className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden transition-opacity ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                        }`}
                    onClick={() => setSidebarOpen(false)}
                />

                {/* Sidebar */}
                <aside
                    className={`
                        fixed inset-y-0 left-0 z-30 bg-[#FAFAFA] border-r border-[#EE4B4A1F]
                        transform transition-all duration-300 ease-in-out
                        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
                        md:translate-x-0 md:static md:inset-auto
                        ${sidebarCollapsed && !isMobile ? "md:w-16" : "md:w-60"}
                        w-60
                        ${!sidebarOpen && !isMobile ? "md:-translate-x-full md:w-0" : ""}
                    `}
                >
                    {(sidebarOpen || !isMobile) && (
                        <NavigationMenu
                            setLoading={setLoading}
                            sidebarOpen={sidebarOpen}
                            setSidebarOpen={setSidebarOpen}
                            sidebarCollapsed={sidebarCollapsed}
                            setSidebarCollapsed={setSidebarCollapsed}
                            isMobile={isMobile}
                        />
                    )}
                </aside>

                {/* PAGE CONTENT */}
                <main className="flex-1 overflow-auto p-8 bg-gray-100">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}