import React from "react";
import { Loader } from "@supportninja/ui-components";
const Insights = () => {
    const [isLoading, setIsLoading] = React.useState(true);
    const [hasError, setHasError] = React.useState(false);

    const handleIframeLoad = () => {
        setIsLoading(false);
        setHasError(false);
    };

    const handleIframeError = () => {
        setIsLoading(false);
        setHasError(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
            {/* Loading Spinner */}
            {isLoading && <Loader />}

            {/* Error Message */}
            {hasError && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded shadow z-50">
                    Failed to load dashboard. Please refresh the page.
                </div>
            )}

            <div className='text-[24px] my-4 w-full font-semibold text-[#313133]'>
                Looker Studio Insights
            </div>

            <main className="w-full">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-0">
                        <div className="w-full">
                            <iframe
                                className="w-full min-h-[400px] md:min-h-[800px] border-0 rounded-xl bg-white"
                                src="https://lookerstudio.google.com/embed/reporting/6b34a174-9651-4ec1-8a55-2642d0049889/page/1v8qD?&urlEmbedding=true"
                                allowFullScreen
                                loading="lazy"
                                onLoad={handleIframeLoad}
                                onError={handleIframeError}
                                sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
                                title="Looker Studio Dashboard"
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Insights;