import axios from 'axios';

const api = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Moderation
export const moderateContent = async (data) => {
    const response = await api.post('/moderate', data);
    return response.data;
};

// Logs
export const getLogs = async (params = {}) => {
    const response = await api.get('/logs', { params });
    return response.data;
};

export const getLogById = async (id) => {
    const response = await api.get(`/logs/${id}`);
    return response.data;
};

export const reviewLog = async (id, reviewData) => {
    const response = await api.patch(`/logs/${id}/review`, reviewData);
    return response.data;
};

// Policies
export const getPolicies = async () => {
    const response = await api.get('/policies');
    return response.data;
};

export const getPolicyById = async (id) => {
    const response = await api.get(`/policies/${id}`);
    return response.data;
};

export const createPolicy = async (data) => {
    const response = await api.post('/policies', data);
    return response.data;
};

export const updatePolicy = async (id, data) => {
    const response = await api.put(`/policies/${id}`, data);
    return response.data;
};

export const deletePolicy = async (id) => {
    const response = await api.delete(`/policies/${id}`);
    return response.data;
};

// Analytics (A13)
export const getAnalyticsOverview = async () => {
    const response = await api.get('/analytics/overview');
    return response.data;
};

export const getAnalyticsTimeSeries = async (days = 30) => {
    const response = await api.get('/analytics/timeseries', { params: { days } });
    return response.data;
};

export const getAnalyticsCategories = async () => {
    const response = await api.get('/analytics/categories');
    return response.data;
};

export default api;
