import axios from 'axios';

const getApiBase = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl && !envUrl.includes('localhost')) {
        return envUrl;
    }
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${hostname}:8000/api`;
};

export const API_BASE = getApiBase();

const api = axios.create({
    baseURL: API_BASE,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('gs_admin_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth
export const login = (data) => api.post('/auth.php?action=login', data);
export const identifyAdmin = (data) => api.post('/auth.php?action=identify', data);
export const sendRecoveryInfo = (data) => api.post('/auth.php?action=send-recovery', data);
export const verifyResetToken = (token) => api.get(`/auth.php?action=verify-reset-token&token=${token}`);
export const resetPasswordWithToken = (data) => api.post('/auth.php?action=reset-password-with-token', data);
export const verifyToken = () => api.get('/auth.php?action=verify');
export const changePassword = (data) => api.post('/auth.php?action=change-password', data);

// Companies
export const getCompanies = () => api.get('/companies.php?action=list');
export const createCompany = (formData) => api.post('/companies.php?action=create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const updateCompany = (formData) => api.post('/companies.php?action=update', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteCompany = (data) => api.post('/companies.php?action=delete', data);

// Company Locations
export const getCompanyLocations = () => api.get('/locations.php?action=list');
export const addCompanyLocation = (data) => api.post('/locations.php?action=create', data);
export const updateCompanyLocation = (data) => api.post('/locations.php?action=update', data);
export const deleteCompanyLocation = (data) => api.post('/locations.php?action=delete', data);

// Vacancies (Public)
export const getVacancies = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/vacancies.php?action=list&${query}`);
};
export const getVacancy = (id) => api.get(`/vacancies.php?action=get&id=${id}`);

// Vacancies (Admin)
export const getAllVacancies = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/vacancies.php?action=all&${query}`);
};
export const createVacancy = (data) => api.post('/vacancies.php?action=create', data);
export const updateVacancy = (data) => api.post('/vacancies.php?action=update', data);
export const deleteVacancy = (data) => api.post('/vacancies.php?action=delete', data);
export const assignVacancyCandidate = (data) => api.post('/vacancies.php?action=assign_candidate', data);
export const getNextReferenceNumber = (companyId) => api.get(`/vacancies.php?action=next_reference_number&company_id=${companyId}`);
export const getVacancyAuditLog = (id) => api.get(`/vacancies.php?action=audit_log&id=${id}`);
export const getAllVacancyAuditLogs = (params = {}) => {
    const query = new URLSearchParams();
    if (params.category) query.append('category', params.category);
    if (params.action_type) query.append('action_type', params.action_type);
    if (params.company_id) query.append('company_id', params.company_id);
    if (params.my_activity) query.append('my_activity', '1');
    if (params.search) query.append('search', params.search);
    const qs = query.toString();
    return api.get(`/vacancies.php?action=all_audit_logs${qs ? '&' + qs : ''}`);
};

// Vacancy approvals
export const getPendingApprovals = () => api.get('/vacancies.php?action=pending_approvals');
export const approveVacancy = (data) => api.post('/vacancies.php?action=approve', data);
export const rejectVacancy = (data) => api.post('/vacancies.php?action=reject', data);


// Applications
export const applyForJob = (formData) => api.post('/applications.php?action=apply', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const aiParseCv = (formData) => api.post('/applications.php?action=ai_parse_cv', formData);
export const getApplications = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/applications.php?action=list&${query}`);
};
export const updateApplicationStatus = (data) => api.post('/applications.php?action=update_status', data);
export const sendInterviewInvitation = (data) => api.post('/applications.php?action=send_interview', data);
export const deleteApplication = (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, value));
    return api.post('/applications.php', formData, { params: { action: 'delete' } });
};
export const bulkDeleteApplications = (data) => {
    const formData = new FormData();
    // Special handling for array of IDs
    if (data.ids && Array.isArray(data.ids)) {
        data.ids.forEach(id => formData.append('ids[]', id));
    }
    return api.post('/applications.php', formData, { params: { action: 'bulk_delete' } });
};
export const getSuggestions = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/applications.php?action=get_suggestions&${query}`);
};
export const getCandidateCount = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/applications.php?action=get_candidate_count&${query}`);
};
export const getMatchingCandidates = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/applications.php?action=get_matching_candidates&${query}`);
};
export const getTalentPool = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/applications.php?action=get_talent_pool&${query}`);
};
export const updateCandidateTags = (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, value));
    return api.post('/applications.php', formData, { params: { action: 'update_candidate_tags' } });
};
export const exportApplications = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/applications.php?action=export&${query}`, { responseType: 'blob' });
};
export const blockCandidate = (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, value));
    return api.post('/applications.php', formData, { params: { action: 'block_candidate' } });
};
export const unblockCandidate = (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, value));
    return api.post('/applications.php', formData, { params: { action: 'unblock_candidate' } });
};
export const getStats = () => api.get('/applications.php?action=stats');
export const confirmInterview = (id, response) => axios.get(`${API_BASE}/applications.php?action=confirm_interview&id=${id}&response=${response}`);

// Admins
export const getAdmins = () => api.get('/admins.php?action=list');
export const createAdmin = (data) => api.post('/admins.php?action=create', data);
export const updateAdmin = (data) => api.post('/admins.php?action=update', data);
export const deleteAdmin = (data) => api.post('/admins.php?action=delete', data);
export const resetAdminPassword = (data) => api.post('/admins.php?action=reset-password', data);

// Settings
export const getSettings = () => api.get('/settings.php');
export const saveSettings = (data) => api.post('/settings.php', data);
export const testSmtpSettings = (data) => api.post('/settings.php?action=test', data);
export const checkGeminiQuota = (data = {}) => api.post('/ai.php?action=quota_status', data);
export const getPublicPdpa = () => api.get('/public_pdpa.php');

// CV Extractions
export const getExtractions = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/applications.php?action=list_extractions&${query}`);
};
export const extractCvAdmin = (data) => api.post('/applications.php?action=extract_cv', data);
export const getExtractionSetting = () => api.get('/applications.php?action=get_extraction_setting');
export const updateExtractionSetting = (data) => api.post('/applications.php?action=update_extraction_setting', data);

// Notifications
export const getNotifications = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/notifications.php?action=list&${query}`);
};
export const getUnreadNotificationCount = () => api.get('/notifications.php?action=unread_count');
export const markNotificationAsRead = (id) => api.post('/notifications.php?action=mark_read', { id });
export const markNotificationAsUnread = (id) => api.post('/notifications.php?action=mark_unread', { id });
export const markAllNotificationsAsRead = () => api.post('/notifications.php?action=mark_all_read');
export const deleteNotification = (id) => api.post('/notifications.php?action=delete', { id });

export default api;

