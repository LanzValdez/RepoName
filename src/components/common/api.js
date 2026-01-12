import axios from 'axios';

export const submitFeedback = async (feedbackData) => {
    try {
        const token = localStorage.getItem('jwt');
        const response = await axios.post(
            'https://api-ai-feedback.dev.supportninja.com/feedback',
            feedbackData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error submitting feedback:', error);
        throw error;
    }
};



export const getFeedback = async (tool, key) => {
    try {
        const token = localStorage.getItem('jwt');
        const response = await axios.get(
            `https://api-ai-feedback.dev.supportninja.com/feedback?tool=${tool}&key=${key}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log("Raw API response:", response);
        return response.data;
    } catch (error) {
        console.error('Error fetching feedback:', error);
        throw error;
    }
};