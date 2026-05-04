import axios from 'axios';

// API base URL - uses Azure Functions in production, local in dev
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health check
export const healthCheck = () => apiClient.get('/health');

// Frameworks
export const getFrameworks = () => apiClient.get('/frameworks');

// Upload document
export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Extract document (generate embeddings)
export const extractDocument = (uploadId) =>
  apiClient.post(`/extract?upload_id=${uploadId}`);

// Analyse document
export const analyseDocument = (uploadId, companyName, framework, userId = 'demo-user') =>
  apiClient.post('/analyse', {
    upload_id: uploadId,
    company_name: companyName,
    framework: framework,
    user_id: userId,
  });

// Get all reports for user
export const getUserReports = (userId) =>
  apiClient.get(`/reports/${userId}`);

// Get single report
export const getReport = (reportId) =>
  apiClient.get(`/report/${reportId}`);

// Update gap status
export const updateGapStatus = (reportId, gapId, status) =>
  apiClient.patch(`/report/${reportId}/gap/${gapId}`, { status });

// Get all tracker gaps aggregated (v2.0 - single API call)
export const getTrackerGaps = (userId) =>
  apiClient.get(`/tracker/gaps/${encodeURIComponent(userId)}`);

// Access control - check user's access status
export const getAccessStatus = (userEmail) =>
  apiClient.get(`/access-status/${encodeURIComponent(userEmail)}`);

// Submit feedback survey
export const submitSurvey = (surveyData) =>
  apiClient.post('/survey', surveyData);

// Request pilot access
export const requestPilotAccess = (email, companyName, message = '') =>
  apiClient.post(`/request-pilot-access?user_email=${encodeURIComponent(email)}&company_name=${encodeURIComponent(companyName)}&message=${encodeURIComponent(message)}`);

export default apiClient;
