/** @type {import('tailwindcss').Config} */
export default {
    darkMode: "class",
    content: ["./index.html", "./src/**/*.{js,jsx}",],
    theme: {
        extend: {
            colors: {
                brand: "#0F172A", // Default text color
                "brand-light": "#1E293B", // Sidebar/Nav bg (light)
                "brand-accent": "#38BDF8", // Highlight/links/buttons
                "brand-gray": "#F1F5F9", // Main bg (light)

                // Dark theme
                "brand-dark": "#0F172A", // Main bg (dark mode)
                "brand-text-dark": "#F1F5F9", // Default text color in dark mode
                "brand-gray-dark": "#1E293B", // Panel or secondary bg (dark mode)
            },
            backgroundColor: ['even', 'odd'],
            fontFamily: {
                sans: ["Work Sans", "sans-serif"],
                tenon: ["tenon", "sans-serif"],
                ivypresto: ["ivypresto-headline", "serif"],
            },
            borderRadius: {
                xl: "1rem",
                "2xl": "1.5rem",
            },
        },
    },
    plugins: [],
}

