import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../../auth/AuthContext';
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import left from "../../assets/icons/left.svg";
import right from "../../assets/icons/right.svg";

const logoutIcon = (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.09142 10C9.09142 7.53855 11.0928 5.53717 13.5543 5.53644V3.68573C13.5543 2.75429 12.8 2 11.8685 2H4.68001C3.75429 2 3 2.75429 3 3.68573V16.3143C3 17.2457 3.75429 18 4.68001 18H11.8685C12.8 18 13.5543 17.2457 13.5543 16.3143V14.4636C11.0935 14.4636 9.09142 12.4615 9.09142 10Z" fill="#545D69" />
        <path d="M13.555 6.67932C11.7215 6.67932 10.2343 8.16647 10.2343 10C10.2343 11.8336 11.7214 13.3207 13.555 13.3207C15.3885 13.3207 16.8757 11.8336 16.8757 10C16.8757 8.16647 15.3885 6.67932 13.555 6.67932ZM15.3907 10.4021L14.3878 11.415C14.2757 11.5279 14.1292 11.585 13.9814 11.585C13.8364 11.585 13.6907 11.5293 13.58 11.42C13.3557 11.1979 13.3535 10.8357 13.5757 10.6121L13.615 10.5714H12.125C11.8092 10.5714 11.5535 10.3157 11.5535 9.99998C11.5535 9.68426 11.8092 9.42855 12.125 9.42855H13.6142L13.5757 9.38927C13.3535 9.16497 13.3557 8.80284 13.58 8.5814C13.8043 8.35853 14.1657 8.3614 14.3878 8.58569L15.3907 9.59855C15.6114 9.82069 15.6114 10.1793 15.3907 10.4021Z" fill="#545D69" />
    </svg>
);

const NavigationMenu = ({
    setLoading,
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    isMobile
}) => {
    const [location, setLocation] = useState(useLocation());
    const userDetails = JSON.parse(localStorage.getItem("loginInfo"))
    const navigate = useNavigate();
    const { logout } = useAuth();

    useEffect(() => {
        setLocation(window.location.pathname);
    }, [window.location.pathname]);

    const handleLogout = async () => {
        setLoading(true);
        try {
            const refreshTokenId = localStorage.getItem("refreshTokenId");
            const idToken = localStorage.getItem("jwt");
            if (refreshTokenId && idToken) {
                const response = await fetch("https://api-rbac.dev.supportninja.com/rbac/logout", {
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

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Logout failed:", errorData);
                }
            }
            logout();
            localStorage.clear();
            navigate("/login", { replace: true });
        } catch (error) {
            console.error("Logout error:", error);
        }
        finally {
            setLoading(false);
        }
    };

    const handleDesktopToggle = () => {
        if (sidebarCollapsed) {
            setSidebarCollapsed(false);
        } else {
            setSidebarCollapsed(true);
        }
    };

    const menu = useMemo(() => {
        const baseMenu = [
            {
                name: "Dashboard",
                path: "/dashboard",
                activeIcon: (
                    <svg width="16" height="17" viewBox="0 0 16 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15.5 8.375V15.875C15.5 16.0408 15.4342 16.1997 15.3169 16.3169C15.1997 16.4342 15.0408 16.5 14.875 16.5H10.5C10.3342 16.5 10.1753 16.4342 10.0581 16.3169C9.94085 16.1997 9.875 16.0408 9.875 15.875V11.8125C9.875 11.7296 9.84208 11.6501 9.78347 11.5915C9.72487 11.5329 9.64538 11.5 9.5625 11.5H6.4375C6.35462 11.5 6.27513 11.5329 6.21653 11.5915C6.15792 11.6501 6.125 11.7296 6.125 11.8125V15.875C6.125 16.0408 6.05915 16.1997 5.94194 16.3169C5.82473 16.4342 5.66576 16.5 5.5 16.5H1.125C0.95924 16.5 0.800269 16.4342 0.683058 16.3169C0.565848 16.1997 0.5 16.0408 0.5 15.875V8.375C0.500154 8.04354 0.63195 7.72571 0.866406 7.49141L7.11641 1.24141C7.3508 1.00716 7.66862 0.87558 8 0.87558C8.33138 0.87558 8.6492 1.00716 8.88359 1.24141L15.1336 7.49141C15.368 7.72571 15.4998 8.04354 15.5 8.375Z" fill="#EE4B4A" />
                    </svg>
                ),
                inactiveIcon: (
                    <svg width="16" height="17" viewBox="0 0 16 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15.5 8.375V15.875C15.5 16.0408 15.4342 16.1997 15.3169 16.3169C15.1997 16.4342 15.0408 16.5 14.875 16.5H10.5C10.3342 16.5 10.1753 16.4342 10.0581 16.3169C9.94085 16.1997 9.875 16.0408 9.875 15.875V11.8125C9.875 11.7296 9.84208 11.6501 9.78347 11.5915C9.72487 11.5329 9.64538 11.5 9.5625 11.5H6.4375C6.35462 11.5 6.27513 11.5329 6.21653 11.5915C6.15792 11.6501 6.125 11.7296 6.125 11.8125V15.875C6.125 16.0408 6.05915 16.1997 5.94194 16.3169C5.82473 16.4342 5.66576 16.5 5.5 16.5H1.125C0.95924 16.5 0.800269 16.4342 0.683058 16.3169C0.565848 16.1997 0.5 16.0408 0.5 15.875V8.375C0.500154 8.04354 0.63195 7.72571 0.866406 7.49141L7.11641 1.24141C7.3508 1.00716 7.66862 0.87558 8 0.87558C8.33138 0.87558 8.6492 1.00716 8.88359 1.24141L15.1336 7.49141C15.368 7.72571 15.4998 8.04354 15.5 8.375Z" fill="#545D69" />
                    </svg>
                ),
                type: "internal",
                id: "dashboard"
            },
            {
                name: "Quality Form",
                path: "/quality-form",
                activeIcon: (
                    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.7778 4.81758C11.054 4.81758 11.2776 5.04188 11.2776 5.31813C11.2776 5.59438 11.054 5.81797 10.7778 5.81797H3.19143C2.91518 5.81797 2.69088 5.59438 2.69088 5.31813C2.69088 5.04188 2.91518 4.81758 3.19143 4.81758H10.7778ZM10.7778 7.49992C11.054 7.49992 11.2776 7.72423 11.2776 8.00047C11.2776 8.27672 11.054 8.50031 10.7778 8.50031H3.19143C2.91518 8.50031 2.69088 8.27672 2.69088 8.00047C2.69088 7.72423 2.91518 7.49992 3.19143 7.49992H10.7778ZM7.58543 10.1823C7.86168 10.1823 8.08527 10.4058 8.08527 10.6821C8.08527 10.9583 7.86168 11.1826 7.58543 11.1826H3.19143C2.91518 11.1826 2.69088 10.9591 2.69088 10.6828C2.69088 10.4066 2.91518 10.1823 3.19143 10.1823H7.58543ZM12.3495 12.1412L9.51128 14.9873V12.4434C9.51633 12.279 9.64905 12.1463 9.81421 12.1419L12.3495 12.1412ZM12.0328 0V0.00072127H1.93644H1.93571C1.21733 0.00072127 0.633818 0.577737 0.620117 1.29396V14.6988C0.633821 15.4158 1.21733 15.9921 1.93571 15.9921L1.93644 15.9913V15.9921L9.7052 16C9.83286 16 9.96052 15.951 10.0579 15.8536L13.2033 12.7002C13.3072 12.5956 13.3562 12.4564 13.3483 12.3194L13.349 1.29403C13.3483 0.577091 12.7512 0.000720116 12.0328 0Z" fill="#EE4B4A" />
                    </svg>
                ),
                type: "internal",
                inactiveIcon: (
                    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.7778 4.81758C11.054 4.81758 11.2776 5.04188 11.2776 5.31813C11.2776 5.59438 11.054 5.81797 10.7778 5.81797H3.19143C2.91518 5.81797 2.69088 5.59438 2.69088 5.31813C2.69088 5.04188 2.91518 4.81758 3.19143 4.81758H10.7778ZM10.7778 7.49992C11.054 7.49992 11.2776 7.72423 11.2776 8.00047C11.2776 8.27672 11.054 8.50031 10.7778 8.50031H3.19143C2.91518 8.50031 2.69088 8.27672 2.69088 8.00047C2.69088 7.72423 2.91518 7.49992 3.19143 7.49992H10.7778ZM7.58543 10.1823C7.86168 10.1823 8.08527 10.4058 8.08527 10.6821C8.08527 10.9583 7.86168 11.1826 7.58543 11.1826H3.19143C2.91518 11.1826 2.69088 10.9591 2.69088 10.6828C2.69088 10.4066 2.91518 10.1823 3.19143 10.1823H7.58543ZM12.3495 12.1412L9.51128 14.9873V12.4434C9.51633 12.279 9.64905 12.1463 9.81421 12.1419L12.3495 12.1412ZM12.0328 0V0.00072127H1.93644H1.93571C1.21733 0.00072127 0.633818 0.577737 0.620117 1.29396V14.6988C0.633821 15.4158 1.21733 15.9921 1.93571 15.9921L1.93644 15.9913V15.9921L9.7052 16C9.83286 16 9.96052 15.951 10.0579 15.8536L13.2033 12.7002C13.3072 12.5956 13.3562 12.4564 13.3483 12.3194L13.349 1.29403C13.3483 0.577091 12.7512 0.000720116 12.0328 0Z" fill="#545D69" />
                    </svg>
                ),
                id: "quality-form"
            },
            {
                name: "Insights",
                path: "/insights",
                activeIcon: (
                    <svg width="16" height="13" viewBox="0 0 16 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0.445202 12.2407H15.5548C15.8046 12.2407 16 12.0361 16 11.7956C16 11.5458 15.8037 11.3504 15.5548 11.3504H15.2341L15.2333 3.91126C15.2333 3.18964 14.6453 2.59247 13.9145 2.59247H12.7118C11.981 2.59247 11.393 3.18964 11.393 3.91126V11.3504H9.92307L9.9239 1.32713C9.9239 0.596321 9.33592 0 8.60511 0H7.39323C6.66242 0 6.07443 0.597176 6.07443 1.32713V11.3496H4.60531V5.59417C4.60531 4.86336 4.01733 4.27538 3.28652 4.27538L2.08383 4.27621C1.35302 4.27621 0.765042 4.8642 0.765042 5.595V11.3504L0.445158 11.3496C0.195426 11.3496 2.65663e-06 11.5458 2.65663e-06 11.7947C-0.000832706 12.0361 0.195482 12.2407 0.445202 12.2407Z" fill="#EE4B4A" />
                    </svg>
                ),
                type: "internal",
                inactiveIcon: (
                    <svg width="16" height="13" viewBox="0 0 16 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0.445202 12.2407H15.5548C15.8046 12.2407 16 12.0361 16 11.7956C16 11.5458 15.8037 11.3504 15.5548 11.3504H15.2341L15.2333 3.91126C15.2333 3.18964 14.6453 2.59247 13.9145 2.59247H12.7118C11.981 2.59247 11.393 3.18964 11.393 3.91126V11.3504H9.92307L9.9239 1.32713C9.9239 0.596321 9.33592 0 8.60511 0H7.39323C6.66242 0 6.07443 0.597176 6.07443 1.32713V11.3496H4.60531V5.59417C4.60531 4.86336 4.01733 4.27538 3.28652 4.27538L2.08383 4.27621C1.35302 4.27621 0.765042 4.8642 0.765042 5.595V11.3504L0.445158 11.3496C0.195426 11.3496 2.65663e-06 11.5458 2.65663e-06 11.7947C-0.000832706 12.0361 0.195482 12.2407 0.445202 12.2407Z" fill="#545D69" />
                    </svg>
                ),
                id: "insights"
            },
            {
                name: "Conversational Analytics",
                path: "/conversation-analytics",
                activeIcon: (
                    <svg width="20" height="13" viewBox="0 0 20 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.03921 10.7383L5.05883 12.8859C4.67104 13.1654 4.11765 12.8995 4.11765 12.4338V10.5504C1.71979 9.92464 0 7.81929 0 5.36914C0 2.40385 2.50194 0 5.58824 0H14.4118C17.4981 0 20 2.40385 20 5.36914C20 8.33444 17.4981 10.7383 14.4118 10.7383H8.03921ZM8.23529 6.78207V5.36914C8.23529 5.057 7.97193 4.80397 7.64706 4.80397C7.32219 4.80397 7.05882 5.057 7.05882 5.36914V6.78207C7.05882 7.09421 7.32219 7.34725 7.64706 7.34725C7.97193 7.34725 8.23529 7.09421 8.23529 6.78207ZM10.5882 6.78207V3.10845C10.5882 2.79631 10.3249 2.54328 10 2.54328C9.67513 2.54328 9.41177 2.79631 9.41177 3.10845V6.78207C9.41177 7.09421 9.67513 7.34725 10 7.34725C10.3249 7.34725 10.5882 7.09421 10.5882 6.78207ZM12.9412 6.78207V4.52138C12.9412 4.20925 12.6778 3.95621 12.3529 3.95621C12.0281 3.95621 11.7647 4.20925 11.7647 4.52138V6.78207C11.7647 7.09421 12.0281 7.34725 12.3529 7.34725C12.6778 7.34725 12.9412 7.09421 12.9412 6.78207Z" fill="#EE4B4A" />
                    </svg>
                ),
                type: "internal",
                inactiveIcon: (
                    <svg width="20" height="13" viewBox="0 0 20 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.03921 10.7383L5.05883 12.8859C4.67104 13.1654 4.11765 12.8995 4.11765 12.4338V10.5504C1.71979 9.92464 0 7.81929 0 5.36914C0 2.40385 2.50194 0 5.58824 0H14.4118C17.4981 0 20 2.40385 20 5.36914C20 8.33444 17.4981 10.7383 14.4118 10.7383H8.03921ZM8.23529 6.78207V5.36914C8.23529 5.057 7.97193 4.80397 7.64706 4.80397C7.32219 4.80397 7.05882 5.057 7.05882 5.36914V6.78207C7.05882 7.09421 7.32219 7.34725 7.64706 7.34725C7.97193 7.34725 8.23529 7.09421 8.23529 6.78207ZM10.5882 6.78207V3.10845C10.5882 2.79631 10.3249 2.54328 10 2.54328C9.67513 2.54328 9.41177 2.79631 9.41177 3.10845V6.78207C9.41177 7.09421 9.67513 7.34725 10 7.34725C10.3249 7.34725 10.5882 7.09421 10.5882 6.78207ZM12.9412 6.78207V4.52138C12.9412 4.20925 12.6778 3.95621 12.3529 3.95621C12.0281 3.95621 11.7647 4.20925 11.7647 4.52138V6.78207C11.7647 7.09421 12.0281 7.34725 12.3529 7.34725C12.6778 7.34725 12.9412 7.09421 12.9412 6.78207Z" fill="#545D69" />
                    </svg>
                ),
                id: "conversation-analytics"
            },
            {
                name: "Notification Systems",
                path: "https://notifications.dev.supportninja.com/",
                activeIcon: null,
                inactiveIcon: (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M15.6921 13.2302C14.8482 10.9458 15.5761 8.4738 14.7087 6.58213C13.9118 4.84394 12.219 3.86447 10.4993 3.8836C8.77951 3.8645 7.08672 4.84399 6.2899 6.58213C5.4233 8.47386 6.15037 10.9458 5.30646 13.2302C5.32747 13.2293 5.34932 13.2293 5.37034 13.2293H15.6268C15.6503 13.2293 15.6711 13.2293 15.6921 13.2302ZM10.5 2C10.9472 2 11.3128 2.36108 11.3128 2.80267V3.30156C11.0447 3.26172 10.7707 3.24262 10.4933 3.24512C10.2201 3.24179 9.95111 3.26089 9.68801 3.2999V2.80184C9.68717 2.36108 10.0528 2 10.5 2ZM5.37178 16.5762H15.6282C16.383 16.5762 17 15.9669 17 15.2215C17 14.4761 16.383 13.8668 15.6282 13.8668H5.37178C4.61697 13.8668 4 14.4769 4 15.2215C4 15.9661 4.61697 16.5762 5.37178 16.5762ZM12.856 17.2137C12.5786 18.2421 11.6288 19 10.5 19C9.37118 19 8.4213 18.2421 8.14397 17.2137H12.856Z" fill="#545D69" />
                    </svg>
                ),
                type: "external",
                id: "notification-systems"
            },
        ];
        return baseMenu;
    }, [userDetails])

    return (
        <div className="h-full flex flex-col font-sans font-medium relative">
            {/* Floating toggle button - positioned at center-right edge */}
            {!isMobile && (
                <button
                    className="absolute top-1/2 -right-3 transform -translate-y-1/2 z-40 
             w-6 h-6 bg-white border border-gray-300 rounded-[6px] 
             flex items-center justify-center shadow-md hover:shadow-lg 
             transition-all duration-200"
                    onClick={handleDesktopToggle}
                    title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {sidebarCollapsed
                        ? <img src={right} alt="Expand" className="w-3 h-3 block object-contain relative -top-[1px]" />
                        : <img src={left} alt="Collapse" className="w-3 h-3 block object-contain relative -top-[1px]" />}
                </button>
            )}

            {/* Navigation content */}
            <nav className="flex-1 py-4 px-0 relative">
                <div className="w-full">
                    {menu.map((item) => {
                        if (item.type === "external") {
                            return (
                                <a
                                    key={item.name}
                                    href={item.path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`rounded-xl flex items-center mx-1 px-4 py-3 transition-all duration-200 
          ${sidebarCollapsed && !isMobile ? "justify-center px-2" : "gap-3"} 
          hover:bg-gray-50`}
                                    title={sidebarCollapsed && !isMobile ? item.name : ""}
                                >
                                    <div className="flex items-center justify-center flex-shrink-0 w-5 h-5">
                                        {item.inactiveIcon}
                                    </div>
                                    {(!sidebarCollapsed || isMobile) && (
                                        <span className="text-[14px] text-gray-700">{item.name}</span>
                                    )}
                                </a>
                            );
                        }

                        // internal
                        return (
                            <NavLink
                                key={item.name}
                                to={item.path}
                                end={false}
                                className={({ isActive }) =>
                                    `rounded-xl flex items-center mx-1 px-4 py-3 transition-all duration-200 
                                ${isActive ? "bg-[#FFF0F0]" : ""} 
                                ${sidebarCollapsed && !isMobile ? "justify-center px-2" : "gap-3"}`
                                }
                                title={sidebarCollapsed && !isMobile ? item.name : ""}
                            >
                                {({ isActive }) => (
                                    <>
                                        <div className="flex items-center justify-center flex-shrink-0 w-5 h-5">
                                            {isActive ? item.activeIcon : item.inactiveIcon}
                                        </div>
                                        {(!sidebarCollapsed || isMobile) && (
                                            <span
                                                className={`text-[14px] ${isActive ? "text-[#EE4B4A] font-semibold" : "text-gray-700"}`}
                                            >
                                                {item.name}
                                            </span>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </div>

                {/* Logout at the bottom */}
                <div className="absolute bottom-6 left-0 right-0 px-6">
                    <button
                        onClick={handleLogout}
                        className={`text-gray-700 flex items-center transition-all duration-200 ${sidebarCollapsed && !isMobile ? "justify-center w-full" : "gap-3"
                            }`}
                        title={sidebarCollapsed && !isMobile ? "Logout" : ""}
                    >
                        <div className={`flex items-center justify-center flex-shrink-0 ${sidebarCollapsed && !isMobile ? "w-5 h-5" : "w-5 h-5"
                            }`}>
                            {logoutIcon}
                        </div>
                        {(!sidebarCollapsed || isMobile) && (
                            <span className="text-[14px]">Logout</span>
                        )}
                    </button>
                </div>
            </nav>
        </div>
    )
}

export default NavigationMenu