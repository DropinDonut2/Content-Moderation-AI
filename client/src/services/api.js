import axios from 'axios';

const api = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json'
    }
});

// ============ MODERATION ============

export const moderateContent = async (data) => {
    const response = await api.post('/moderate', data);
    return response.data;
};

// ============ LOGS ============

export const getLogs = async (params = {}) => {
    const response = await api.get('/logs', { params });
    return response.data;
};

export const getLogById = async (id) => {
    const response = await api.get(`/logs/${id}`);
    return response.data;
};

export const submitReview = async (id, reviewData) => {
    const response = await api.patch(`/logs/${id}/review`, reviewData);
    return response.data;
};

// Alias for submitReview (some components use this name)
export const reviewLog = submitReview;

// ============ POLICIES ============

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

// ============ CHARACTERS ============

export const getCharacters = async (params = {}) => {
    const response = await api.get('/content/characters', { params });
    return response.data;
};

export const getCharacterById = async (id) => {
    const response = await api.get(`/content/characters/${id}`);
    return response.data;
};

export const reviewCharacter = async (id, reviewData) => {
    const response = await api.patch(`/content/characters/${id}/review`, reviewData);
    return response.data;
};

// ============ STORYLINES ============

export const getStorylines = async (params = {}) => {
    const response = await api.get('/content/storylines', { params });
    return response.data;
};

export const getStorylineById = async (id) => {
    const response = await api.get(`/content/storylines/${id}`);
    return response.data;
};

export const reviewStoryline = async (id, reviewData) => {
    const response = await api.patch(`/content/storylines/${id}/review`, reviewData);
    return response.data;
};

// ============ PERSONAS ============

export const getPersonas = async (params = {}) => {
    const response = await api.get('/content/personas', { params });
    return response.data;
};

export const getPersonaById = async (id) => {
    const response = await api.get(`/content/personas/${id}`);
    return response.data;
};

export const reviewPersona = async (id, reviewData) => {
    const response = await api.patch(`/content/personas/${id}/review`, reviewData);
    return response.data;
};

// ============ CONTENT STATS ============

export const getContentStats = async () => {
    const response = await api.get('/content/stats');
    return response.data;
};

// ============ RE-RUN MODERATION ============

export const rerunModeration = async (type, id) => {
    const endpoint = `/content/${type}/${id}/moderate`;
    const response = await api.post(endpoint);
    return response.data;
};

// ============ BULK MODERATE ============

export const bulkModerateAll = async () => {
    const response = await api.post('/content/moderate-all-pending');
    return response.data;
};

// ============ ANALYTICS ============

export const getAnalyticsOverview = async () => {
    const response = await api.get('/analytics/overview');
    return response.data;
};

// Both naming conventions for compatibility
export const getAnalyticsTimeseries = async (params = {}) => {
    const response = await api.get('/analytics/timeseries', { params });
    return response.data;
};
export const getAnalyticsTimeSeries = getAnalyticsTimeseries;

export const getAnalyticsCategories = async () => {
    const response = await api.get('/analytics/categories');
    return response.data;
};

// ============ POLICY IMPORT (NEW) ============

export const importPoliciesFromUrl = async (url) => {
    const response = await api.post('/policies/import/url', { url });
    return response.data;
};

export const importPoliciesFromHtml = async (html) => {
    const response = await api.post('/policies/import/html', { html });
    return response.data;
};

export const importPoliciesFromFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/policies/import/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const savePolicies = async (policies, mode = 'merge') => {
    const response = await api.post('/policies/import/save', { policies, mode });
    return response.data;
};

export default api;