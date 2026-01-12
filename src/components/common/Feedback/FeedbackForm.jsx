import React, { useState, useRef, useEffect } from 'react';
import thumbsUp from "../../../assets/icons/thumbs-up.svg";
import thumbsDown from "../../../assets/icons/thumbs-down.svg";
import thumbsUpFilled from "../../../assets/icons/thumbs-up-filled.svg";
import thumbsDownFilled from "../../../assets/icons/thumbs-down-filled.svg";
import addIcon from "../../../assets/icons/add-filled.svg";
import { FeedbackForm } from '@supportninja/ui-components';
import { createPortal } from 'react-dom';

const Feedback = ({ handleFeedbackSubmit, tool = "", handleThumbsRating }) => {
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [highlighted, setHighlighted] = useState(null); // 'up' | 'down' | null
    const popupRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setOpen(false);
            }
        }
        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const handleThumbsUp = async () => {
        setLoading(true);
        setHighlighted('up');
        setTimeout(() => setHighlighted(null), 1000);
        await handleThumbsRating(5, tool);
        setLoading(false);
    };

    const handleThumbsDown = async () => {
        setLoading(true);
        setHighlighted('down');
        setTimeout(() => setHighlighted(null), 1000);
        await handleThumbsRating(1, tool);
        setLoading(false);
    };

    const popupBase = "absolute -left-3/4 -translate-x-3/4 flex gap-4 bg-white shadow-lg rounded-xl p-3 z-50 transition-all duration-300";
    const popupOpen = "opacity-100 scale-100 pointer-events-auto";
    const popupClosed = "opacity-0 scale-90 pointer-events-none";

    return (
        <div className="relative flex" ref={popupRef}>
            <button
                className="transition-colors"
                onClick={() => setOpen((v) => !v)}
                aria-label="Feedback"
                disabled={loading}
            >
                <img
                    src={thumbsUp}
                    alt="Thumbs Up"
                    width={18}
                    height={18}
                />
            </button>
            <div
                className={
                    popupBase + " " + (open ? popupOpen : popupClosed)
                }
                style={{
                    minWidth: 120,
                    bottom: `calc(100% + 10px)`,
                }}
            >
                <button
                    className="transition-colors"
                    onClick={handleThumbsUp}
                    aria-label="Thumbs Up"
                    disabled={loading}
                >
                    <img
                        src={highlighted === 'up' ? thumbsUpFilled : thumbsUp}
                        alt="Thumbs Up"
                        width={28}
                        height={28}
                    />
                </button>
                <button
                    className="transition-colors"
                    onClick={handleThumbsDown}
                    aria-label="Thumbs Down"
                    disabled={loading}
                >
                    <img
                        src={highlighted === 'down' ? thumbsDownFilled : thumbsDown}
                        alt="Thumbs Down"
                        width={28}
                        height={28}
                    />
                </button>
                <button
                    className="transition-colors"
                    onClick={() => {
                        setShowFeedbackForm(true);
                        setOpen(false);
                    }}
                    aria-label="Add Feedback"
                >
                    <img
                        src={addIcon}
                        alt="Add"
                        width={28}
                        height={28}
                    />
                </button>
            </div>

            {showFeedbackForm && createPortal(
                <FeedbackForm
                    onClose={() => setShowFeedbackForm(false)}
                    onSubmit={handleFeedbackSubmit}
                    ratingMode="thumbs"
                    tool={tool}
                />, document.body)}
        </div>
    );
};

export default Feedback;