import React, { useState, useEffect } from "react";
import { Drawer, Button, Loader, FeedbackForm, Chip, Toast } from "@supportninja/ui-components"
import { toTitleCase } from "../common/strings";
import copy from "../../assets/icons/copy.svg"
import tick from "../../assets/icons/tick.svg"
import { getFeedback, submitFeedback } from "../common/api";
import thumbsUp from "../../assets/icons/thumbs-up.svg";
import { createPortal } from 'react-dom';
import thumbsDown from "../../assets/icons/thumbs-down.svg";
import thumbsUpFilled from "../../assets/icons/thumbs-up-filled.svg";
import thumbsDownFilled from "../../assets/icons/thumbs-down-filled.svg";
import addIcon from "../../assets/icons/add-filled.svg";
import openNewTab from "../../assets/icons/new-tab.svg";
import { useNavigate } from "react-router-dom";

const MetricsDetails = ({ open, onClose, openDrawer }) => {
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [highlighted, setHighlighted] = useState(null);
    const [existingFeedback, setExistingFeedback] = useState(null);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const showToast = (msg, opts = {}) => setToast({ message: msg, ...opts });
    console.log({ existingFeedback })
    const sourceUrl = openDrawer?.data?.ticket_url || "N/A";
    const canCopy = sourceUrl && sourceUrl !== "N/A";

    const handleCopy = async () => {
        if (!canCopy) return;
        try {
            await navigator.clipboard.writeText(sourceUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (e) {
            console.error("Copy failed:", e);
        }
    };

    const handleThumbsUp = async () => {
        if (existingFeedback) return; // Can't edit existing feedback

        setHighlighted('up');
        await handleThumbsRating(5, openDrawer?.data);
        //setLoading(false);
    };

    const handleThumbsDown = async () => {
        if (existingFeedback) return; // Can't edit existing feedback
        setHighlighted('down');
        await handleThumbsRating(1, openDrawer?.data);
    };

    const handleAddFeedback = () => {
        if (existingFeedback) return; // Can't edit existing feedback
        setShowFeedbackForm(true);
    };

    useEffect(() => {
        if (openDrawer?.open) {
            setLoading(true)
            fetchExistingFeedback("aiqa", openDrawer?.data?.ticket_id);
            setLoading(false)
        }
        else {
            setExistingFeedback(null);
            setHighlighted(null);
        }
    }, [openDrawer?.open])

    const fetchExistingFeedback = async (tool, key) => {
        if (!tool || !key) return;

        setFeedbackLoading(true);
        try {
            const response = await getFeedback(tool, key);
            console.log("Feedback response:", response); // Debug log

            // Extract the first item from the items array
            const feedbackItems = response?.items || [];
            const feedbackData = feedbackItems.length > 0 ? feedbackItems[0] : null;

            console.log("Feedback data:", feedbackData); // Debug log

            // Check if feedbackData exists AND has a feedback property with a value
            if (feedbackData && feedbackData.feedback !== undefined && feedbackData.feedback !== null) {
                setExistingFeedback(feedbackData);
                // Set highlighted state based on feedback value
                const feedbackValue = parseInt(feedbackData.feedback);
                if (feedbackValue === 1) {
                    setHighlighted('down');
                } else if (feedbackValue === 5) {
                    setHighlighted('up');
                }
            } else {
                setExistingFeedback(null);
                setHighlighted(null);
            }
        } catch (error) {
            console.error("Error fetching feedback:", error);
            // If there's an error (like 404 - not found), treat as no feedback
            setExistingFeedback(null);
            setHighlighted(null);
        } finally {
            setFeedbackLoading(false);
        }
    };


    const handleFeedbackSubmit = async (data, row) => {
        const feedbackData = {
            tool: data?.tool,
            feedback: parseInt(data?.rating),
            key: row?.ticket_id?.toString(),
            comment: data?.feedback || "",
            metadata: {
                ticket_id: row?.ticket_id,
                sentiment: row?.sentiment
            }
        }
        setLoading(true);
        try {
            if (!data?.rating) {
                showToast("Rating cannot be empty", {
                    type: "warning",
                    duration: 4000,
                    position: "bottom-right",
                    onClose: () => setToast(null),
                })
                return;
            }
            const response = await submitFeedback(feedbackData);
            if (response) {
                showToast("Feedback added successfully", {
                    type: "success",
                    duration: 4000,
                    position: "bottom-right",
                    onClose: () => setToast(null),
                })
                fetchExistingFeedback("aiqa", row?.ticket_id);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            showToast("Failed to add feedback", {
                type: "error",
                duration: 4000,
                position: "bottom-right",
                onClose: () => setToast(null),
            })
        } finally {
            setLoading(false);
        }

    };

    const handleThumbsRating = async (rating, row) => {

        const feedbackData = {
            tool: "aiqa",
            key: row?.ticket_id?.toString(),
            feedback: parseInt(rating),
            comment: "",
            metadata: {
                ticket_id: row?.ticket_id,
                sentiment: row?.sentiment
            }
        }
        setLoading(true);
        try {
            const response = await submitFeedback(feedbackData);
            if (response) {
                showToast("Feedback added successfully", {
                    type: "success",
                    duration: 4000,
                    position: "bottom-right",
                    onClose: () => setToast(null),
                })
                fetchExistingFeedback("aiqa", row?.ticket_id);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            showToast("Failed to add feedback", {
                type: "error",
                duration: 4000,
                position: "bottom-right",
                onClose: () => setToast(null),
            })
        } finally {
            setLoading(false);
        }

    };

    const data = openDrawer?.data;

    return (
        <Drawer
            isOpen={open}
            onClose={onClose}
            title="Evaluation Details"
            position="right"
            width="650px"
            footer={
                <div style={{ textAlign: "right" }} className="flex gap-2 justify-end">
                    <Button className="btn-secondary-active !px-5 !py-2" onClick={onClose}>
                        Close
                    </Button>
                </div>
            }
        >
            <div>
                {(loading || feedbackLoading) && <Loader />}
                {toast && <Toast {...toast} />}
                <div className="p-1 grid grid-cols-2 gap-4">
                    <div>
                        <p className="font-semibold">Ticket ID:</p>
                        <span
                            onClick={() => {
                                if (data?.ticket_id) {
                                    // Ensure position_id is a single value
                                    const positionId = Array.isArray(data.position_id)
                                        ? data.position_id[0]
                                        : data.position_id;

                                    const accountId = data.account_id || localStorage.getItem("selectedAccount");
                                    localStorage.setItem("currentAgent", positionId);
                                    localStorage.setItem("ticket", data?.ticket_id);
                                    navigate('/quality-form', {
                                        state: {
                                            accountId: accountId,
                                            positionId: positionId,
                                            ticketId: data.ticket_id
                                        }
                                    });
                                }
                            }}
                            className={`relative cursor-pointer text-blue-700 font-medium inline-block group ${data?.ticket_id ? "" : "pointer-events-none text-gray-500"
                                }`}
                        >
                            <span className="inline-flex items-center">
                                {data?.ticket_id || "-"}
                                {data?.ticket_id && (
                                    <img
                                        src={openNewTab}
                                        alt="View details"
                                        className="cursor-pointer ml-1 w-4 h-4"
                                    />
                                )}
                            </span>
                            {data?.ticket_id && (
                                <span className="absolute left-0 bottom-0 h-[1.5px] w-0 bg-blue-700 transition-all duration-300 group-hover:w-full" />
                            )}
                        </span>
                    </div>
                    <div>
                        <p className="font-semibold">Name:</p>
                        <span>{data?.assignee_name || "N/A"}</span>
                    </div>
                    <div>
                        <p className="font-semibold">QA Score:</p>
                        <span>{data?.qa_score || "N/A"}</span>
                    </div>
                    <div>
                        <p className="font-semibold">Manual QA Score:</p>
                        <span>{data?.manual_qa_score || "N/A"}</span>
                    </div>
                    <div>
                        <p className="font-semibold">Issue:</p>
                        <span>{data?.issue || "N/A"}</span>
                    </div>
                    <div>
                        <p className="font-semibold">Sentiment:</p>
                        <span>
                            {(
                                <Chip
                                    variant={
                                        data?.sentiment === "positive"
                                            ? "success"
                                            : data?.sentiment === "negative"
                                                ? "error"
                                                : "processing"
                                    }
                                >
                                    {toTitleCase(data?.sentiment || "")}
                                </Chip>
                            ) || "N/A"}
                        </span>
                    </div>
                    <div>
                        <p className="font-semibold">Created At:</p>
                        <span>
                            {data?.created_at
                                ? new Date(data.created_at).toLocaleString()
                                : "N/A"}
                        </span>
                    </div>
                    <div>
                        <p className="font-semibold">Updated At:</p>
                        <span>
                            {data?.updated_at
                                ? new Date(data.updated_at).toLocaleString()
                                : "N/A"}
                        </span>
                    </div>
                    <div>
                        <p className="font-semibold">Position ID:</p>
                        <span>{data?.position_id || "N/A"}</span>
                    </div>
                    <div>
                        <p className="font-semibold">Duration (hh:mm:ss):</p>
                        <span>{data?.duration_seconds || "N/A"}</span>
                    </div>
                    <div>
                        <p className="font-semibold">Search Key:</p>
                        <span>{data?.lookup_key || "N/A"}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 p-1">
                    <p className="font-semibold">Source System URL:</p>
                    <span className="truncate max-w-[320px]" title={sourceUrl}>
                        {canCopy ? (
                            <a
                                href={sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline"
                            >
                                View Source
                            </a>
                        ) : (
                            sourceUrl
                        )}
                    </span>
                    {canCopy && (
                        copied ? (
                            <>
                                <img
                                    src={tick} // your tick icon import
                                    alt="Copied!"
                                    className="w-5 h-5"
                                    style={{ transition: 'opacity 0.2s' }}
                                />
                                <span className="text-blue-800">Copied</span>
                            </>
                        ) : (
                            <img
                                src={copy}
                                alt="Copy"
                                className="cursor-pointer w-5 h-5"
                                onClick={handleCopy}
                                style={{ transition: 'opacity 0.2s' }}
                            />
                        )
                    )}
                </div>
                <div className="p-1">
                    <p className="font-semibold">Feedback:</p>
                    <span>{data?.feedback || "N/A"}</span>
                </div>

                <div className='mt-6 p-1'>
                    <p className="font-semibold">Rate your experience:</p>
                    {/* Show existing feedback comment if exists */}
                    {existingFeedback?.comment && (
                        <div className="mb-3 p-2 bg-gray-50 rounded">
                            <p className="text-sm font-medium text-gray-700">Your feedback:</p>
                            <p className="text-sm text-gray-600">{existingFeedback.comment}</p>
                        </div>
                    )}
                    <div className='flex gap-2'>
                        <button
                            className={`transition-colors ${existingFeedback ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={handleThumbsUp}
                            aria-label="Thumbs Up"
                            disabled={loading || feedbackLoading || existingFeedback}
                            title={existingFeedback ? "Feedback already submitted" : "Thumbs Up"}
                        >
                            <img
                                src={highlighted === 'up' ? thumbsUpFilled : thumbsUp}
                                alt="Thumbs Up"
                                width={20}
                                height={20}
                            />
                        </button>
                        <button
                            className={`transition-colors ${existingFeedback ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={handleThumbsDown}
                            aria-label="Thumbs Down"
                            disabled={loading || feedbackLoading || existingFeedback}
                            title={existingFeedback ? "Feedback already submitted" : "Thumbs Down"}
                        >
                            <img
                                src={highlighted === 'down' ? thumbsDownFilled : thumbsDown}
                                alt="Thumbs Down"
                                width={20}
                                height={20}
                            />
                        </button>
                        <button
                            className={`transition-colors ${existingFeedback ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={handleAddFeedback}
                            aria-label="Add Feedback"
                            disabled={existingFeedback}
                            title={existingFeedback ? "Feedback already submitted" : "Add detailed feedback"}
                        >
                            <img
                                src={addIcon}
                                alt="Add"
                                width={20}
                                height={20}
                            />
                        </button>
                    </div>
                    {existingFeedback && (
                        <p className="text-xs text-gray-500 mt-2">
                            Feedback already submitted and cannot be edited
                        </p>
                    )}
                </div>
            </div>
            {showFeedbackForm && createPortal(
                <FeedbackForm
                    onClose={() => setShowFeedbackForm(false)}
                    onSubmit={(data) => handleFeedbackSubmit(data, openDrawer?.data)}
                    ratingMode="thumbs"
                    tool={"aiqa"}
                    modalClassName="!z-[1002]"
                />, document.body)}
        </Drawer>
    );
}

export default MetricsDetails;